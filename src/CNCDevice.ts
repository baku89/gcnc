import {parseGrblStatus} from './parseGrblStatus.js'
import {createNodeSerialPort, SerialPortDevice} from './SerialPort.js'

interface GCodeLine {
	command: string
	number: number
}

export type GCodeSource = AsyncIterable<GCodeLine>

export abstract class CNCDevice {
	abstract open(): Promise<void>

	abstract close(): Promise<void>

	abstract send(line: string): Promise<string>

	async sendLines(source: GCodeSource, totalLines?: number): Promise<void> {
		console.log('Sending G-code...')

		const digits = totalLines?.toString().length ?? 0

		for await (const {command, number} of source) {
			await this.send(command)

			console.log(
				`${number.toString().padStart(digits)}/${totalLines}: ${command}`
			)
		}

		console.log('Finished sending G-code.')
	}
}

interface SerialGrblCNCOptions {
	baudRate?: number
	checkCoordinateInterval?: number
}

export class SerialCNCDevice extends CNCDevice {
	readonly portName: string
	readonly baudRate: number

	readonly checkCoordinateInterval: number
	private checkCoordinateIntervalId?: NodeJS.Timeout

	private device?: SerialPortDevice

	constructor(port: string, options: SerialGrblCNCOptions = {}) {
		super()

		this.portName = port
		this.baudRate = options.baudRate ?? 115200
		this.checkCoordinateInterval = options.checkCoordinateInterval ?? 250
	}

	async open() {
		this.device = await createNodeSerialPort(this.portName, this.baudRate)

		this.checkCoordinateIntervalId = setInterval(async () => {
			const status = await this.send('?')
			console.log('Status:', [status])
			const parsed = parseGrblStatus(status)
			console.warn(parsed)
		}, this.checkCoordinateInterval)
	}

	async close() {
		await this.device?.close()
		clearInterval(this.checkCoordinateIntervalId)
	}

	async send(line: string) {
		if (!this.device) {
			throw new Error('Device not open')
		}

		return this.device.write(line)
	}
}
