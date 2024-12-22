import {EventEmitter} from 'eventemitter3'

import {type GCode, parseGCode} from './parseGCode.js'
import {type GrblStatus, parseGrblStatus} from './parseGrblStatus.js'
import {createNodeSerialPort, SerialPortDevice} from './SerialPort.js'

interface GCodeLine {
	command: string
	number: number
}

export type GCodeSource = AsyncIterable<GCodeLine>

interface CNCDeviceEvents {
	status: (status: GrblStatus) => void
	sent: (line: GCode) => void
}

export abstract class CNCDevice extends EventEmitter<CNCDeviceEvents> {
	abstract open(): Promise<void>

	abstract close(): Promise<void>

	abstract send(line: string): Promise<string>

	async sendLines(source: GCodeSource, totalLines?: number): Promise<void> {
		console.log('Sending G-code...')

		const digits = totalLines?.toString().length ?? 0

		for await (const {command, number} of source) {
			console.log(
				`${number.toString().padStart(digits)}/${totalLines}: ${command}`
			)

			await this.send(command)

			if (command.trim() !== '') {
				const parsed = parseGCode(command)
				if (parsed) {
					this.emit('sent', parsed)
				}
			}
		}

		console.log('Finished sending G-code.')
	}
}

interface SerialGrblCNCOptions {
	/**
	 * The baud rate to use.
	 *
	 * @default 115200
	 */
	baudRate?: number

	/**
	 * The interval to check the status report.
	 *
	 * @default 250
	 */
	checkStatusInterval?: number
}

export class SerialCNCDevice extends CNCDevice {
	readonly portName: string
	readonly baudRate: number

	readonly checkStatusInterval: number
	private checkStatusIntervalId?: NodeJS.Timeout

	private device?: SerialPortDevice

	/**
	 * @param port The port name
	 * @param options The options
	 */
	constructor(port: string, options: SerialGrblCNCOptions = {}) {
		super()

		this.portName = port
		this.baudRate = options.baudRate ?? 115200
		this.checkStatusInterval = options.checkStatusInterval ?? 250
	}

	async open() {
		this.device = await createNodeSerialPort(this.portName, this.baudRate)

		this.checkStatusIntervalId = setInterval(async () => {
			const status = await this.send('?')
			const parsed = parseGrblStatus(status)
			this.emit('status', parsed)
		}, this.checkStatusInterval)
	}

	async close() {
		await this.device?.close()
		clearInterval(this.checkStatusIntervalId)
	}

	async send(line: string) {
		if (!this.device) {
			throw new Error('Device not open')
		}

		return this.device.write(line)
	}
}
