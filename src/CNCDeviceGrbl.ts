import {CNCDevice} from './CNCDevice.js'
import {
	openNodeSerialPortDevice,
	openWebSerialPortDevice,
	openWebSocketSerialPortDevice,
	type SerialPortDevice,
} from './openSerialPortDevice.js'
import {parseGrblLog} from './parseGrblLog.js'
import {parseGrblStatus} from './parseGrblStatus.js'
import {SerialQueue} from './utils/SerialQueue.js'

export interface SerialGrblCNCOptions {
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

export abstract class CNCDeviceGrbl extends CNCDevice {
	protected device?: SerialPortDevice
	readonly baudRate: number
	readonly checkStatusInterval: number

	private checkStatusIntervalId?: NodeJS.Timeout
	private queue = new SerialQueue<string>()
	private pendingLines: string[] = []
	private emitMessage = true
	private isResetting = false

	constructor(options: SerialGrblCNCOptions = {}) {
		super()
		this.baudRate = options.baudRate ?? 115200
		this.checkStatusInterval = options.checkStatusInterval ?? 250
	}

	abstract createSerialPort(): Promise<SerialPortDevice>

	get isOpen() {
		return this.device !== undefined
	}

	async open() {
		this.device = await this.createSerialPort()

		this.device.on('line', line => {
			if (line.startsWith('ets')) {
				// Detect Esprissif reset
				this.queue.clear()
				this.pendingLines = []
				this.emitMessage = true
				this.isResetting = true
			}

			if (this.emitMessage) {
				this.emit('message', line, this.queue.isRunning)
			}

			if (line.startsWith('[MSG:')) {
				const log = parseGrblLog(line)
				this.emit('log', log)
			}

			if (line.startsWith('Grbl')) {
				this.isResetting = false
			}

			if (this.isResetting) {
				return
			}

			if (line === 'ok' || line.startsWith('<Sleep')) {
				if (line.startsWith('<Sleep')) {
					this.pendingLines.push(line)
				}

				this.queue.resolveCurrent(this.pendingLines.join('\n'))
				this.pendingLines = []
			} else if (line.startsWith('error:')) {
				this.queue.rejectCurrent(this.pendingLines.join('\n'))
				this.pendingLines = []
			} else if (line.startsWith('ALARM:')) {
				this.emit('alarm')
			} else if (!line.startsWith('Grbl')) {
				this.pendingLines.push(line)
			}
		})

		this.device.on('disconnect', () => {
			console.log('disconnected')
			this.device = undefined
			this.queue.clear()
			this.emit('disconnect')
		})

		if (this.checkStatusInterval !== Infinity) {
			this.checkStatusIntervalId = setInterval(async () => {
				if (this.isResetting) {
					return
				}

				const status = await this.send('?', false).catch(() => null)
				if (status !== null) {
					const parsed = parseGrblStatus(status)
					this.emit('status', parsed)
				}
			}, this.checkStatusInterval)
		}

		this.emit('connect')
	}

	async close() {
		await this.queue.waitUntilSettled()
		await this.device?.close()
		this.device = undefined
		clearInterval(this.checkStatusIntervalId)

		this.emit('disconnect')
	}

	async send(line: string, emitMessage = true) {
		const message = await this.queue.add(async () => {
			if (!this.device) throw new Error('Device not open')

			this.emitMessage = emitMessage
			this.device.write(line).catch(err => err)
		})

		this.emitMessage = true

		return message
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

	async reset() {
		await this.send('\x18')
	}

	async pause() {
		await this.send('!')
	}

	async resume() {
		await this.send('~')
	}
}

export class CNCDeviceNodeSerialGrbl extends CNCDeviceGrbl {
	readonly portName: string

	constructor(portName: string, options: SerialGrblCNCOptions = {}) {
		super(options)
		this.portName = portName
	}

	async createSerialPort() {
		return openNodeSerialPortDevice(this.portName, this.baudRate)
	}
}

export class CNCDeviceWebSerialGrbl extends CNCDeviceGrbl {
	readonly port: SerialPort

	constructor(port: SerialPort, options: SerialGrblCNCOptions = {}) {
		super(options)
		this.port = port
	}

	async createSerialPort() {
		return openWebSerialPortDevice(this.port, this.baudRate)
	}
}

export class CNCDeviceWebSocketGrbl extends CNCDeviceGrbl {
	readonly url: string

	constructor(url: string, options: SerialGrblCNCOptions = {}) {
		super(options)
		this.url = url
	}

	async createSerialPort() {
		return openWebSocketSerialPortDevice(this.url)
	}
}
