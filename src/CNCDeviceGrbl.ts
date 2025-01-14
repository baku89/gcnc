import fromCallback from 'p-from-callback'

import {CNCDevice} from './CNCDevice.js'
import {
	openNodeSerialPortDevice,
	openWebSerialPortDevice,
	openWebSocketSerialPortDevice,
	type SerialPortDevice,
} from './openSerialPortDevice.js'
import {parseGrblLog} from './parseGrblLog.js'
import {parseGrblStatus} from './parseGrblStatus.js'
import {CNCStatus} from './type.js'
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

	private queue = new SerialQueue()
	private emitMessage = true

	private state: null | string = null

	constructor(options: SerialGrblCNCOptions = {}) {
		super()
		this.baudRate = options.baudRate ?? 115200
		this.checkStatusInterval = options.checkStatusInterval ?? 250
	}

	/**@hidden */
	abstract createSerialPort(): Promise<SerialPortDevice>

	get isOpen() {
		return this.device !== undefined
	}

	async open() {
		this.device = await this.createSerialPort()
		this.queue = new SerialQueue()

		this.device.on('line', line => {
			// Handle reset (detect Espressif reset)
			if (line.startsWith('ets')) {
				this.queue.clear()
				this.emitMessage = true
				this.state = 'resetting'
			}

			// Output message
			if (this.emitMessage) {
				this.emit('message', line, this.queue.isPending)
			}

			// Handle log
			if (line.startsWith('[MSG:')) {
				const log = parseGrblLog(line)
				this.emit('log', log)
				return
			}

			// Handle status
			if (line.startsWith('<')) {
				this.onReceiveStatus(line)
			}

			// Grbl initialization complete
			if (line.startsWith('Grbl')) {
				this.state = null
			}

			if (this.state === 'resetting') {
				return
			}

			// Handle response
			if (line === 'ok' || line.startsWith('<Sleep')) {
				this.queue.resolvePending()
			} else if (line.startsWith('error:')) {
				this.queue.clear()
			} else if (line.startsWith('ALARM:')) {
				this.queue.clear()
			}
		})

		this.device.on('disconnect', () => {
			this.queue.terminate()
			this.device = undefined
			this.emit('disconnect')
		})

		if (this.checkStatusInterval !== Infinity) {
			this.queue.addRecurring(async () => {
				this.checkState()
			}, this.checkStatusInterval)
		}

		this.checkState()

		await fromCallback<void>(cb => this.once('status', () => cb(null)))

		this.emit('connect')
	}

	async close() {
		await this.queue?.terminate()
		await this.device?.close()
		this.device = undefined
		this.state = null

		this.emit('disconnect')
	}

	async send(line: string, emitMessage = true) {
		if (this.state === 'resetting') {
			throw new Error('Device is resetting')
		}

		if (this.state === 'sleep' && line !== '?' && line !== '\x18') {
			throw new Error('Device is sleeping')
		}

		await this.queue
			.add(async () => {
				if (!this.device) throw new Error('Device not open')

				this.emitMessage = emitMessage
				this.device.write(`${line}`).catch(err => err)
			})
			.finally(() => {
				this.emitMessage = true
			})
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
		this.checkState()
	}

	async sleep() {
		await this.send('$SLP')
		await this.checkState()
	}

	async unlock() {
		await this.send('$X')
		this.checkState()
	}

	async pause() {
		await this.send('!')
		this.checkState()
	}

	async resume() {
		await this.send('~')
		this.checkState()
	}

	private async checkState() {
		if (this.state === 'resetting') return

		this.send('?', false).catch(() => null)

		return await fromCallback<CNCStatus>(cb =>
			this.once('status', status => cb(null, status))
		)
	}

	private onReceiveStatus(line: string) {
		const parsed = parseGrblStatus(line)
		this.state = parsed.state
		this.emit('status', parsed)
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
