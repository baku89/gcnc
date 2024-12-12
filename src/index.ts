import {isNode} from 'browser-or-node'
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

export async function countTotalLines(filePath: string) {
	const fs = await import('node:fs')
	const readline = await import('node:readline')

	// Open the file as a stream
	let fileStream = fs.createReadStream(filePath)
	const rl = readline.createInterface({
		input: fileStream,
		crlfDelay: Infinity,
	})

	let totalLines = 0
	for await (const _ of rl) {
		totalLines++
	}

	return totalLines
}

/**
 * Send G-code commands to a CNC machine.
 * @param filePath Path to the G-code file (Node.js only, ignored in browser)
 * @param portName Serial port to use (Node.js only, ignored in browser)
 */
export async function sendGCode(
	filePath: string,
	portName: string
): Promise<void> {
	let serial: WritableStream<string>

	if (isNode) {
		const fs = await import('node:fs')
		const readline = await import('node:readline')

		const totalLines = await countTotalLines(filePath)
		const digits = totalLines.toString().length

		serial = await createNodeSerial(portName)
		const writer = serial.getWriter()

		// Open the file as a stream
		let fileStream = fs.createReadStream(filePath, {encoding: 'utf-8'})
		const rl = readline.createInterface({
			input: fileStream,
			crlfDelay: Infinity,
		})

		console.log('Sending G-code...')

		let currentLine = 0
		for await (const line of rl) {
			currentLine++
			await writer.write(line)

			console.log(
				`${currentLine.toString().padStart(digits)}/${totalLines}: ${line}`
			)
		}
		rl.close()
	} else {
		throw new Error('Not yet implemented')
	}

	await serial.close()
	console.log('Finished sending G-code.')
}
