import {withResolvers} from './util.js'
import fromCallback from 'p-from-callback'

export interface SerialPortDevice {
	write(line: string): Promise<string>
	close(): Promise<void>
}

export async function createNodeSerialPort(
	portName: string,
	baudRate: number
): Promise<SerialPortDevice> {
	const {SerialPort} = await import('serialport')
	const port = new SerialPort({
		path: portName,
		baudRate,
		autoOpen: false,
	})

	const queues: ReturnType<typeof withResolvers<string>>[] = []

	port.on('data', (data: Buffer) => {
		const responses = data
			.toString()
			.split('\n')
			.filter(line => line.trim() !== '')

		for (const res of responses) {
			queues.shift()?.resolve(res)
		}
	})

	await fromCallback<void>(cb => port.open(cb))
	console.log(`Connected to ${portName}`)

	// Error handling
	port.on('error', err => console.error(`Error: ${err.message}`))

	return {
		write: async (line: string) => {
			const {promise, resolve, reject} = withResolvers<string>()

			const err = await fromCallback(cb =>
				port.write(`${line}\n`, err => cb(undefined, err))
			)

			if (err) {
				reject(err)
			} else {
				queues.push({promise, resolve, reject})
			}

			return promise
		},
		close: async () => {
			// Wait for all pending writes to finish
			while (queues.length > 0) {
				await queues[0].promise
				queues.shift()
			}

			await fromCallback<void>(cb => port.close(cb))
		},
	}
}
