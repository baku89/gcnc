import fromCallback from 'p-from-callback'
import PQueue from 'p-queue'

import {createLineStream} from './util.js'

export interface SerialPortDevice {
	write(line: string): Promise<void>
	on(event: 'line', listener: (line: string) => void): void
	on(event: 'disconnect', listener: () => void): void
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

// Web Serial API用の実装
export async function createWebSerialPort(
	port: SerialPort,
	baudRate: number
): Promise<SerialPortDevice> {
	const queue = new PQueue({concurrency: 1})
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
		on: (_, listener) => {
			onLineListeners.add(listener)
		},
		write: async (line: string) => {
			await writer.write(encoder.encode(line + '\n'))
		},
		close: async () => {
			await queue.onIdle()
			writer.releaseLock()
			reader.releaseLock()
			await port.close()
		},
	}
}
