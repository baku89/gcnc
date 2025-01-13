import mqtt from 'mqtt'
import fromCallback from 'p-from-callback'
import sleep from 'p-sleep'

import {CNCDevice} from './CNCDevice.js'
import {withResolvers} from './util.js'
import {SerialQueue} from './utils/SerialQueue.js'

const nextSequenceId = (() => {
	let id = 0
	return () => id++
})()

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * A CNCDevice implementation for Bambu Lab printers.
 * Original implementation is based on https://github.com/THE-SIMPLE-MARK/bambu-node
 */
export class CNCDeviceBambu extends CNCDevice {
	private host: string
	private accessCode: string
	private serialNumber: string
	private device?: mqtt.MqttClient

	private queue = new SerialQueue<
		void,
		{sequence_id: number; command: string}
	>()

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
		})

		await fromCallback(cb => device.on('connect', () => cb(null, null)))

		this.device = device

		// subscribe to the only available topic (report)
		this.subscribe(`device/${this.serialNumber}/report`, (payload: unknown) => {
			if (!isPlainObject(payload)) {
				return
			}

			const category = Object.keys(payload)[0]
			const command = payload[category]

			if (!isPlainObject(command)) {
				return
			}

			if (
				this.queue.currentPayload?.sequence_id === command.sequence_id &&
				this.queue.currentPayload?.command === command.command
			) {
				this.queue.resolveCurrent()
				return
			}

			if (command.command === 'push_status') {
				return
			}

			console.log('unhandled message', payload)
		})

		// sleep for a second so the printer has time to process the subscription
		await sleep(1000)

		this.emit('connect')
	}

	private subscribe(topic: string, callback: (payload: unknown) => void) {
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

	private async executeCommand(category: string, command: string, param = '') {
		const sequence_id = nextSequenceId()

		await this.queue.add(
			async (_, reject) => {
				if (!this.device) throw new Error('Device not connected')

				const data = {
					[category]: {command, param, sequence_id},
				}

				const topic = `device/${this.serialNumber}/request`

				this.device.publish(topic, JSON.stringify(data), error => {
					if (error) {
						reject(`Error publishing to topic ${topic}: ${error}`)
					}
				})
			},
			{sequence_id, command}
		)
	}

	async send(line: string) {
		if (!this.device) {
			throw new Error('Device not connected')
		}

		if (line === '!') {
			await this.pause()
			return 'ok'
		}

		if (line === '~') {
			await this.resume()
			return 'ok'
		}

		await this.executeCommand('print', 'gcode_line', line)

		return 'ok'
	}

	async home() {
		await this.send('G28')
	}

	async reset() {}

	async pause() {
		await this.executeCommand('print', 'pause')
	}

	async resume() {
		await this.executeCommand('print', 'resume')
	}

	async close() {
		await this.queue.waitUntilSettled()
		await this.device?.endAsync()
		this.device = undefined
	}
}
