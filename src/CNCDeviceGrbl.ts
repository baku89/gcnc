import PQueue from 'p-queue'

import {CNCDevice} from './CNCDevice.js'
import {parseGrblStatus} from './parseGrblStatus.js'
import {
	createNodeSerialPort,
	createWebSerialPort,
	SerialPortDevice,
} from './SerialPort.js'
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

	protected queue = new PQueue({concurrency: 1})
	protected currentRequest: ReturnType<typeof withResolvers<string>> | null =
		null
	protected pendingLines: string[] = []

	constructor(options: SerialGrblCNCOptions = {}) {
		super()
		this.baudRate = options.baudRate ?? 115200
		this.checkStatusInterval = options.checkStatusInterval ?? 250
	}

	abstract createSerialPort(): Promise<SerialPortDevice>

	private onLine(line: string) {
		if (this.queue.size === 0) {
			this.emit('message', line)
			return
		}

		this.pendingLines.push(line)

		if (line === 'ok') {
			this.currentRequest?.resolve(this.pendingLines.join('\n'))
			this.pendingLines = []
			this.currentRequest = null
		} else if (line.startsWith('[')) {
			if (
				this.pendingLines.length > 0 &&
				this.pendingLines[0].startsWith('error:')
			) {
				this.currentRequest?.reject(this.pendingLines.join('\n'))
				this.pendingLines = []
				this.currentRequest = null
			}
		}
	}

	get isOpen() {
		return this.device !== undefined
	}

	async open() {
		this.device = await this.createSerialPort()
		this.device.on('line', this.onLine.bind(this))

		this.checkStatusIntervalId = setInterval(async () => {
			const res = await this.send('?', false).catch(() => '')
			if (res.endsWith('ok')) {
				const [status] = res.split('\n')
				const parsed = parseGrblStatus(status)
				this.emit('status', parsed)
			}
		}, this.checkStatusInterval)

		this.emit('connected')
	}

	async close() {
		await this.queue.onIdle()
		await this.device?.close()
		this.device = undefined
		clearInterval(this.checkStatusIntervalId)

		this.emit('disconnected')
	}

	async send(line: string, emitMessage = true) {
		const request = withResolvers<string>()
		await this.queue.add(async () => {
			if (!this.device) throw new Error('Device not open')

			this.currentRequest = request
			await this.device.write(line).catch(err => err)
		})

		const message = await request.promise

		if (emitMessage) {
			this.emit('message', message)
		}

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
}

export class CNCDeviceNodeSerialGrbl extends CNCDeviceGrbl {
	readonly portName: string

	constructor(portName: string, options: SerialGrblCNCOptions = {}) {
		super(options)
		this.portName = portName
	}

	async createSerialPort() {
		return createNodeSerialPort(this.portName, this.baudRate)
	}
}

export class CNCDeviceWebSerialGrbl extends CNCDeviceGrbl {
	readonly port: SerialPort

	constructor(port: SerialPort, options: SerialGrblCNCOptions = {}) {
		super(options)
		this.port = port
	}

	async createSerialPort() {
		return createWebSerialPort(this.port, this.baudRate)
	}
}
