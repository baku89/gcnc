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

		message = message.replace(/MSG/, styleText('gray', 'MSG'))
		message = message.replace(/info|idle|sleep|run/i, m =>
			styleText('green', m)
		)
		message = message.replace(/alarm|error/i, m => styleText('red', m))

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
			process.stdout.write('^X\n')
			device.reset().catch(err => err)
		}
	})

	rl.on('line', input => {
		device.send(input).catch(err => err)
		rl.prompt()
	}).on('close', () => {
		resolve()
	})

	return promise
}
