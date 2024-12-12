import fromCallback from 'p-from-callback'

const withResolvers = function <T>() {
	let resolve: (value: T | PromiseLike<T>) => void
	let reject: (reason?: any) => void

	const promise = new Promise<T>((res, rej) => {
		resolve = res
		reject = rej
	})

	return {promise, resolve: resolve!, reject: reject!}
}

export async function createNodeSerial(
	portName: string
): Promise<WritableStream<string>> {
	const {SerialPort} = await import('serialport')
	const port = new SerialPort({
		path: portName,
		baudRate: 115200,
		autoOpen: false,
	})

	const queues: ReturnType<typeof withResolvers<void>>['resolve'][] = []

	port.on('data', (data: Buffer) => {
		const responses = data
			.toString()
			.split('\n')
			.filter(line => line.trim() === 'ok')

		for (const _ of responses) {
			queues.shift()?.()
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
			}

			queues.push(resolve)

			return promise
		},
		close: async () => {},
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
	portName: string
): Promise<void> {
	let serial: WritableStream<string>

	const totalLines = await countTotalLines(source)

	console.log(`Total lines: ${totalLines}`)

	const digits = totalLines.toString().length

	serial = await createNodeSerial(portName)
	const writer = serial.getWriter()

	console.log('Sending G-code...')
	const reader = await source()

	let currentLine = 0
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
