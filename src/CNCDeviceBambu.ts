import mqtt, {UniqueMessageIdProvider} from 'mqtt'
import fromCallback from 'p-from-callback'
import sleep from 'p-sleep'

import {CNCDevice} from './CNCDevice.js'
import {withResolvers} from './util.js'
import {SerialQueue} from './utils/SerialQueue.js'

let sequenceId = 0

/**
 * A CNCDevice implementation for Bambu Lab printers.
 * Original implementation is based on https://github.com/THE-SIMPLE-MARK/bambu-node
 */
export class CNCDeviceBambu extends CNCDevice {
	private host: string
	private accessCode: string
	private serialNumber: string
	private device?: mqtt.MqttClient

	private queue = new SerialQueue<void>()

	constructor(options: {
		host: string
		accessCode: string
		serialNumber: string
	}) {
		super()
		this.host = options.host
		this.accessCode = options.accessCode
		this.serialNumber = options.serialNumber
	}

	get isOpen() {
		return this.device !== undefined
	}

	async open() {
		const device = mqtt.connect(`mqtts://${this.host}:8883`, {
			username: 'bblp',
			password: this.accessCode,
			protocolId: 'MQIsdp',
			protocolVersion: 3,
			rejectUnauthorized: false,
			messageIdProvider: new UniqueMessageIdProvider(),
		})

		await fromCallback(cb => device.on('connect', () => cb(null, null)))

		this.device = device

		// subscribe to the only available topic (report)
		this.subscribe(`device/${this.serialNumber}/report`, (payload: any) => {
			if (payload.print.command === 'gcode_line') {
				this.queue.resolveCurrent()
			}
		})

		// sleep for a second so the printer has time to process the subscription
		await sleep(1000)

		this.emit('connect')
	}

	private subscribe(topic: string, callback: (payload: object) => void) {
		if (!this.device) {
			throw new Error('Device not connected')
		}

		const {resolve, promise, reject} = withResolvers()

		this.device.subscribe(topic, err => {
			if (err) {
				reject(`Error subscribing to topic ${topic}: ${err.message}`)
			} else {
				resolve()
			}
		})

		this.device.on('message', (receivedTopic, payload) => {
			if (receivedTopic !== topic) return

			const message = JSON.parse(payload.toString())
			callback(message)
		})

		return promise
	}

	private async executeCommand(payload: unknown) {
		await this.queue.add(async (_, reject) => {
			if (!this.device) throw new Error('Device not connected')

			const topic = `device/${this.serialNumber}/request`

			this.device.publish(topic, JSON.stringify(payload), error => {
				if (error) {
					reject(`Error publishing to topic ${topic}: ${error}`)
				}
			})
		})
	}

	async send(line: string) {
		if (!this.device) {
			throw new Error('Device not connected')
		}

		await this.executeCommand({
			print: {
				command: 'gcode_line',
				sequence_id: sequenceId++,
				param: line,
				user_id: '1234567890',
			},
		})

		return 'ok'
	}

	async home() {
		await this.send('G28')
	}

	async reset() {}

	async close() {
		this.device = undefined
	}
}
