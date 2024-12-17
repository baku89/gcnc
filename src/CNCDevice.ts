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
}

export class SerialCNCDevice extends CNCDevice {
	readonly portName: string
	readonly baudRate: number

	private device?: SerialPortDevice

	constructor(port: string, options: SerialGrblCNCOptions = {}) {
		super()

		this.portName = port
		this.baudRate = options.baudRate ?? 115200
	}

	async open() {
		this.device = await createNodeSerialPort(this.portName, this.baudRate)
	}

	async close() {
		await this.device?.close()
	}

	async send(line: string) {
		if (!this.device) {
			throw new Error('Device not open')
		}

		return this.device.write(line)
	}
}
