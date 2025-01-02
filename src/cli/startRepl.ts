import {createInterface} from 'node:readline'

import fromCallback from 'p-from-callback'

import {CNCDevice} from '../CNCDevice.js'

export async function startRepl(device: CNCDevice) {
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
	})

	while (true) {
		const command = await fromCallback<string>(cb =>
			rl.question('>', answer => cb(null, answer))
		)
		const res = await device.send(command).catch(err => err)
		console.log(res)
	}
}
