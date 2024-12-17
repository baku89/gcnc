import fromCallback from 'p-from-callback'

import {withResolvers} from './util'

export async function createNodeSerial(
	portName: string
): Promise<WritableStream<string>> {
	const {SerialPort} = await import('serialport')
	const port = new SerialPort({
		path: portName,
		baudRate: 115200,
		autoOpen: false,
	})

	const queues: Exclude<ReturnType<typeof withResolvers<void>>, 'reject'>[] = []

	port.on('data', (data: Buffer) => {
		const responses = data
			.toString()
			.split('\n')
			.filter(line => line.trim() === 'ok')

		for (const _ of responses) {
			queues.shift()?.resolve()
		}
	})

	await fromCallback<void>(cb => port.open(cb))
	console.log(`Connected to ${portName}`)

	// Error handling
	port.on('error', err => console.error(`Error: ${err.message}`))

	return new WritableStream<string>({
		write: async (line: string) => {
			const {promise, resolve, reject} = withResolvers<void>()

			const err = await fromCallback<Error | null | undefined>(cb =>
				port.write(`${line}\n`, cb)
			)

			if (err) {
				reject(err)
			} else {
				queues.push({promise, resolve, reject})
			}

			return promise
		},
		close: async () => {
			while (queues.length > 0) {
				await queues[0].promise
			}
			// Close the port
			await fromCallback<void>(cb => port.close(cb))
		},
		abort() {},
	})
}

export type GCodeSource = () => Promise<{
	[Symbol.asyncIterator](): AsyncIterableIterator<string>
	close?(): void
}>

export async function countTotalLines(source: GCodeSource): Promise<number> {
	let totalLines = 0
	const reader = await source()
	for await (const _ of reader) {
		totalLines++
	}
	reader.close?.()

	return totalLines
}

/**
 * Send G-code commands to a CNC machine.
 * @param source Source of G-code commands. Can be a string or function that returns a writable stream.
 * @param portName Serial port to use (Node.js only, ignored in browser)
 */
export async function sendGCode(
	source: GCodeSource,
	portName: string,
	skippedLines = 0
): Promise<void> {
	const serial = await createNodeSerial(portName)
	const totalLines = (await countTotalLines(source)) + skippedLines

	console.log(`Total lines: ${totalLines}`)

	const digits = totalLines.toString().length

	const writer = serial.getWriter()

	console.log('Sending G-code...')
	const reader = await source()

	let currentLine = skippedLines
	for await (const line of reader) {
		currentLine++
		await writer.write(line)

		console.log(
			`${currentLine.toString().padStart(digits)}/${totalLines}: ${line}`
		)
	}

	reader.close?.()
	writer.releaseLock()
	await serial.close()

	console.log('Finished sending G-code.')
}
