import {EventEmitter} from 'eventemitter3'

import {parseGCode} from './parseGCode.js'
import {parseGrblStatus} from './parseGrblStatus.js'
import {createNodeSerialPort, SerialPortDevice} from './SerialPort.js'
import {
	type GCode,
	type GCodeSource,
	type GCodeSourceLine,
	type GrblStatus,
} from './type.js'

interface CNCDeviceEvents {
	status: (status: GrblStatus) => void
	sent: (gcode: GCode, line: GCodeSourceLine) => void
}

export abstract class CNCDevice extends EventEmitter<CNCDeviceEvents> {
	abstract open(): Promise<void>

	abstract close(): Promise<void>

	abstract send(line: string): Promise<string>

	/**
	 * Run the homing sequence.
	 * @param axes The axes to home. If not specified, all axes will be homed.
	 */
	abstract home(axes?: string[]): Promise<void>

	async sendLines(source: GCodeSource, totalLines?: number): Promise<void> {
		console.log('Sending G-code...')

		const digits = totalLines?.toString().length ?? 0

		for await (const {text, number} of source) {
			console.log(
				`${number.toString().padStart(digits)}/${totalLines}: ${text}`
			)

			await this.send(text)

			if (text.trim() !== '') {
				const parsed = parseGCode(text)
				if (parsed) {
					this.emit('sent', parsed, {text, number})
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
			const res = await this.send('?').catch(() => '')
			if (res.endsWith('ok')) {
				const [status] = res.split('\n')
				const parsed = parseGrblStatus(status)
				this.emit('status', parsed)
			}
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

	async home(axes?: string[]) {
		if (!axes) {
			await this.send('$H')
		} else {
			for (const axis of axes) {
				await this.send(`$H${axis.toUpperCase()}`)
			}
		}
	}
}
