import PQueue from 'p-queue'

import {CNCDevice} from './CNCDevice.js'
import {
	openNodeSerialPortDevice,
	openWebSerialPortDevice,
	type SerialPortDevice,
} from './openSerialPortDevice.js'
import {parseGrblLog} from './parseGrblLog.js'
import {parseGrblStatus} from './parseGrblStatus.js'
import {withResolvers} from './util.js'

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

export abstract class CNCDeviceGrbl extends CNCDevice {
	protected device?: SerialPortDevice
	readonly baudRate: number
	readonly checkStatusInterval: number

	private checkStatusIntervalId?: NodeJS.Timeout
	private queue = new PQueue({concurrency: 1})
	private currentRequest: ReturnType<typeof withResolvers<string>> | null = null
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
				this.currentRequest = null
				this.emitMessage = true
				this.isResetting = true
			}

			if (this.emitMessage) {
				this.emit('message', line, this.currentRequest === null)
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

				this.currentRequest?.resolve(this.pendingLines.join('\n'))
				this.pendingLines = []
				this.currentRequest = null
			} else if (line.startsWith('error:')) {
				this.currentRequest?.reject(this.pendingLines.join('\n'))
				this.pendingLines = []
				this.currentRequest = null
			} else if (line.startsWith('ALARM:')) {
				this.emit('alarm')
			} else {
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
		console.log('close')
		await this.queue.onIdle()
		await this.device?.close()
		this.device = undefined
		clearInterval(this.checkStatusIntervalId)

		this.emit('disconnect')
	}

	async send(line: string, emitMessage = true) {
		const request = withResolvers<string>()

		this.queue.add(async () => {
			if (!this.device) throw new Error('Device not open')

			this.currentRequest = request
			this.emitMessage = emitMessage
			this.device.write(line).catch(err => err)
			await request.promise.catch(err => err)
		})

		const message = await request.promise
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
