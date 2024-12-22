import OSC from 'osc-js'

import {type CNCDevice} from './CNCDevice.js'

export function bindWithOSC(device: CNCDevice, osc: OSC) {
	device.on('status', status => {
		if (!osc) return

		// 軸位置の送信
		const axes = [
			status.position.x ?? 0,
			status.position.y ?? 0,
			status.position.z ?? 0,
			status.position.a ?? 0,
			status.position.b ?? 0,
			status.position.c ?? 0,
		]

		osc.send(new OSC.Message('/gcnc/report/axes', ...axes))

		// ステータスの送信
		osc.send(new OSC.Message('/gcnc/report/status', status.state))

		// 送り速度の送信
		osc.send(new OSC.Message('/gcnc/report/feedRate', status.feedRate ?? 0))
	})

	// Gコード送信時のハンドラ
	device.on('sent', gcode => {
		if (!osc) return

		// 送信したコマンドの通知
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
