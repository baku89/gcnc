import fromCallback from 'p-from-callback'
import PQueue from 'p-queue'

import {withResolvers} from './util.js'

export interface SerialPortDevice {
	get isOpen(): boolean
	write(line: string): Promise<string>
	close(): Promise<void>
}

export async function createNodeSerialPort(
	portName: string,
	baudRate: number
): Promise<SerialPortDevice> {
	const {SerialPort} = await import('serialport')
	const readline = await import('node:readline')

	const port = new SerialPort({
		path: portName,
		baudRate,
		autoOpen: false,
	})

	const queue = new PQueue({concurrency: 1, timeout: 1000})
	let currentRequest: ReturnType<typeof withResolvers<string>> | null = null

	const rl = readline.createInterface({
		input: port,
		crlfDelay: Infinity,
	})

	let lines = ''

	rl.on('line', (line: string) => {
		console.warn('Got:', [line])

		// TODO: The code shouldn't be tightly coupled with Grbl
		if (line === 'ok') {
			currentRequest?.resolve(lines)
			lines = ''
			currentRequest = null
		} else if (line.startsWith('error:')) {
			currentRequest?.reject(new Error(line))
			lines = ''
			currentRequest = null
		} else if (line.startsWith('<')) {
			lines += line + '\n'
		}
	})

	await fromCallback<void>(cb => port.open(cb))
	console.log(`Connected to ${portName}`)

	// Error handling
	port.on('error', err => console.error(`Error: ${err.message}`))

	return {
		get isOpen() {
			return port.isOpen
		},
		write: async (line: string) => {
			const request = withResolvers<string>()

			queue.add(async () => {
				currentRequest = request

				const err = await fromCallback(cb =>
					port.write(`${line}\n`, err => cb(undefined, err))
				)

				if (err) {
					currentRequest = null
					request.reject(err)
				}
			})

			return request.promise
		},
		close: async () => {
			// Wait for all pending writes to finish
			await queue.onIdle()
			await fromCallback<void>(cb => port.close(cb))
		},
	}
}
