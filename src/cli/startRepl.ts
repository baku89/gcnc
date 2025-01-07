import {createInterface} from 'node:readline'

import {CNCDevice} from '../CNCDevice.js'
import {withResolvers} from '../util.js'

// https://qiita.com/shellyln/items/9f6c85afee2f7a5773d7
export async function startRepl(device: CNCDevice) {
	const {promise, resolve} = withResolvers()

	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: '>',
	})

	rl.prompt()

	device.on('message', message => {
		console.log(message)
		rl.prompt()
	})

	// Detect Ctrl-X (Reset)
	process.stdin.on('keypress', async (_, key) => {
		if (key.ctrl && key.name === 'x') {
			const res = await device.send('\x18').catch(err => err)
			console.log(res)
			rl.prompt()
		}
	})

	rl.on('line', async input => {
		const res = await device.send(input, false).catch(err => err)
		console.log(res)
		rl.prompt()
	}).on('close', () => {
		resolve()
	})

	return promise
}
