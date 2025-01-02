import OSC from 'osc-js'

import {type CNCDevice} from '../CNCDevice.js'

export function bindWithOSC(
	device: CNCDevice,
	{port, host}: {port: number; host: string}
) {
	const osc = new OSC({
		plugin: new OSC.DatagramPlugin({
			// @ts-expect-error: osc-js is not typed correctly
			send: {port, host},
		}),
	})

	console.log(`Launching OSC server on port ${port}`)

	osc.on('open', () => {
		console.log(`OSC server is running on port ${host}`)
	})

	osc.open()

	device.on('status', status => {
		if (!osc) return

		// Send axis positions
		const axes = [
			status.position.x ?? 0,
			status.position.y ?? 0,
			status.position.z ?? 0,
			status.position.a ?? 0,
			status.position.b ?? 0,
			status.position.c ?? 0,
		]

		osc.send(new OSC.Message('/gcnc/report/axes', ...axes))

		// Send status
		osc.send(new OSC.Message('/gcnc/report/status', status.state))

		// Send feed rate
		osc.send(new OSC.Message('/gcnc/report/feedRate', status.feedRate ?? 0))
	})

	// Handler for G-code transmission
	device.on('sent', gcode => {
		if (!osc) return

		// Notify sent command
		const axes = [
			gcode.x ?? 0,
			gcode.y ?? 0,
			gcode.z ?? 0,
			gcode.a ?? 0,
			gcode.b ?? 0,
			gcode.c ?? 0,
		]

		osc.send(new OSC.Message('/gcnc/sent/axes', ...axes))
		osc.send(new OSC.Message('/gcnc/sent/command', gcode.command))
		osc.send(new OSC.Message('/gcnc/sent/feedRate', gcode.feedRate ?? 0))
	})
}
