import debounce from 'debounce'
import fromCallback from 'p-from-callback'

import {createLineStream} from './util.js'

export interface SerialPortDevice {
	write(line: string): Promise<void>
	on(event: 'line', listener: (line: string) => void): void
	on(event: 'disconnect', listener: () => void): void
	close(): Promise<void>
}

/**
 * Node.js implementation
 */
export async function openNodeSerialPortDevice(
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

	const rl = readline.createInterface({
		input: port,
		crlfDelay: Infinity,
	})

	await fromCallback<void>(cb => port.open(cb))

	return {
		on: (event, listener) => {
			if (event === 'line') {
				rl.on('line', listener)
			} else if (event === 'disconnect') {
				port.on('close', listener)
			}
		},
		write: async (line: string) => {
			const err = await fromCallback(cb => {
				port.write(`${line}\n`, err => cb(undefined, err))
			})

			if (err) {
				throw err
			}
		},
		close: async () => {
			await fromCallback<void>(cb => port.close(cb))
		},
	}
}

/**
 * Web Serial API implementation
 */
export async function openWebSerialPortDevice(
	port: SerialPort,
	baudRate: number
): Promise<SerialPortDevice> {
	await port.open({baudRate})

	if (!port.writable || !port.readable) {
		throw new Error('Port is not open')
	}

	const writer = port.writable.getWriter()
	const reader = port.readable.getReader()

	const lines = createLineStream(reader)

	const onLineListeners = new Set<(line: string) => void>()

	;(async () => {
		for await (const line of lines) {
			onLineListeners.forEach(listener => listener(line))
		}
	})()

	const encoder = new TextEncoder()

	return {
		on: (event, listener) => {
			if (event === 'line') {
				onLineListeners.add(listener)
			} else if (event === 'disconnect') {
				port.addEventListener('disconnect', () => listener(''))
			}
		},
		write: async (line: string) => {
			await writer.write(encoder.encode(line + '\n'))
		},
		close: async () => {
			writer.releaseLock()
			await reader.cancel()
			reader.releaseLock()
			await port.close()
		},
	}
}

/**
 * WebSocket implementation
 */
export async function openWebSocketSerialPortDevice(
	url: string
): Promise<SerialPortDevice> {
	const ws = new WebSocket(url, ['arduino'])
	ws.binaryType = 'arraybuffer'

	console.info('WebSocket connecting... ', url)

	await fromCallback<void>(cb =>
		ws.addEventListener('open', () => cb(undefined))
	)

	console.info('WebSocket connected: ', url)

	async function write(line: string) {
		ws.send(line + '\n')
	}

	async function close() {
		ws.close()
		emitDisconnectEvent()
	}

	const onDisconnectListeners = new Set<() => void>()
	const onLineListeners = new Set<(line: string) => void>()

	ws.addEventListener('message', ({data}) => {
		if (typeof data === 'string' && data.startsWith('PING')) {
			onPing()
		} else if (data instanceof ArrayBuffer) {
			const text = new TextDecoder().decode(data).trim()
			onLineListeners.forEach(listener => listener(text))
		}
	})

	const onPing = debounce(() => {
		console.info('Ping timeout: ', url)
		close()
	}, 10000)

	function emitDisconnectEvent() {
		onDisconnectListeners.forEach(listener => listener())
	}

	ws.addEventListener('close', emitDisconnectEvent)

	return {
		on: async (event, listener) => {
			if (event === 'line') {
				onLineListeners.add(listener)
			} else if (event === 'disconnect') {
				onDisconnectListeners.add(() => listener(''))
			}
		},
		write,
		close,
	}
}
