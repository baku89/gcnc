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

	const queue = new PQueue({concurrency: 1})
	let currentRequest: ReturnType<typeof withResolvers<string>> | null = null

	const rl = readline.createInterface({
		input: port,
		crlfDelay: Infinity,
	})

	let pendingLines: string[] = []

	rl.on('line', (line: string) => {
		pendingLines.push(line)

		if (line === 'ok') {
			// When 'ok' is received, join and return all pending lines
			currentRequest?.resolve(pendingLines.join('\n'))
			pendingLines = []
			currentRequest = null
		} else if (line.startsWith('[')) {
			// Usually error messages start with '['. If the previous line starts with 'error:', treat as error
			if (pendingLines.length > 0 && pendingLines[0].startsWith('error:')) {
				currentRequest?.reject(pendingLines.join('\n'))
				pendingLines = []
				currentRequest = null
			}
		}
	})

	await fromCallback<void>(cb => port.open(cb))
	console.log(`Connected to ${portName}`)

	return {
		get isOpen() {
			return port.isOpen
		},
		write: async (line: string) => {
			const request = withResolvers<string>()

			await queue.add(async () => {
				currentRequest = request

				const err = await fromCallback(cb => {
					port.write(`${line}\n`, err => cb(undefined, err))
				})

				if (err) {
					currentRequest = null
					request.reject(err)
				}

				return request.promise
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
