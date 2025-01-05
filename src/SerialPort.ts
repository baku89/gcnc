import fromCallback from 'p-from-callback'
import PQueue from 'p-queue'

import {withResolvers} from './util.js'

export interface SerialPortDevice {
	get isOpen(): boolean
	write(line: string): Promise<string>
	close(): Promise<void>
}

// Node.js用のSerialPort実装
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
			currentRequest?.resolve(pendingLines.join('\n'))
			pendingLines = []
			currentRequest = null
		} else if (line.startsWith('[')) {
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
			await queue.onIdle()
			await fromCallback<void>(cb => port.close(cb))
		},
	}
}

// Web Serial API用の実装
export async function createWebSerialPort(
	port: SerialPort,
	baudRate: number
): Promise<SerialPortDevice> {
	const queue = new PQueue({concurrency: 1})
	let currentRequest: ReturnType<typeof withResolvers<string>> | null = null
	let pendingLines: string[] = []

	await port.open({baudRate})
	if (!port.writable || !port.readable) {
		throw new Error('Port is not open')
	}

	const writer = port.writable.getWriter()
	const reader = port.readable.getReader()
	const decoder = new TextDecoder()

	// バックグラウンドで読み取り続ける
	;(async () => {
		try {
			while (true) {
				const {value, done} = await reader.read()
				if (done) break

				const text = decoder.decode(value)
				const lines = text.split('\n')

				for (const line of lines) {
					if (!line) continue
					pendingLines.push(line)

					if (line === 'ok') {
						currentRequest!.resolve(pendingLines.join('\n'))
						pendingLines = []
						currentRequest = null
					} else if (line.startsWith('error:')) {
						currentRequest!.reject(new Error(pendingLines.join('\n')))
						pendingLines = []
						currentRequest = null
					}
				}
			}
		} catch (err) {
			currentRequest!.reject(err)
		}
	})()

	return {
		get isOpen() {
			return port.readable !== null && port.writable !== null
		},
		write: async (line: string) => {
			const request = withResolvers<string>()
			currentRequest = request

			await queue.add(async () => {
				const encoder = new TextEncoder()
				await writer.write(encoder.encode(line + '\n'))
				return request.promise
			})

			return request.promise
		},
		close: async () => {
			await queue.onIdle()
			writer.releaseLock()
			reader.releaseLock()
			await port.close()
		},
	}
}
