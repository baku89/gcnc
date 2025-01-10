import {createInterface} from 'node:readline'
import {styleText} from 'node:util'

import {CNCDevice} from '../CNCDevice.js'
import {withResolvers} from '../util.js'

// https://qiita.com/shellyln/items/9f6c85afee2f7a5773d7
export async function startRepl(device: CNCDevice) {
	const {promise, resolve} = withResolvers()

	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: styleText(['bold', 'gray'], '>'),
	})

	rl.prompt()

	device.on('message', message => {
		// Clear the line and print the message
		process.stdout.write('\r' + message + '\n')
		rl.prompt()
	})

	device.on('disconnect', () => {
		rl.close()
		process.stdout.write('\nDisconnected\n')
		resolve()
	})

	// Detect Ctrl-X (Reset)
	process.stdin.on('keypress', async (_, key) => {
		if (key.ctrl && key.name === 'x') {
			process.stdout.write('^X')
			await device.reset()
		}
	})

	rl.on('line', async input => {
		device.send(input).catch(err => err)
	}).on('close', () => {
		resolve()
	})

	return promise
}
