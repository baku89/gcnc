import mqtt from 'mqtt'

import {CNCDevice} from './CNCDevice.js'

export class CNCDeviceBambu extends CNCDevice {
	private host: string
	private accessCode: string
	private serialNumber: string
	private device?: mqtt.MqttClient

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
		this.device = mqtt.connect(`mqtts://${this.host}:8883`, {
			username: 'bblp',
			password: this.accessCode,
			reconnectPeriod: 1000,
			connectTimeout: 2000,
			keepalive: 20,
			resubscribe: true,
			rejectUnauthorized: false,
		})
	}

	private sendCommand() {
		// if (!this.device) {
		// 	throw new Error('Device not connected')
		// }
	}

	async send(line: string) {
		if (!this.device) {
			throw new Error('Device not connected')
		}

		console.log('send', line)

		// this.sendCommand({
		// 	print: {
		// 		command: 'gcode_line',
		// 		sequence_id: 2006,
		// 		param: {gcode: `${line}\n`},
		// 	},
		// 	user_id: '1234567890',
		// })

		return 'ok'
	}

	async home() {
		await this.send('G28')
	}

	async reset() {}

	async close() {
		this.device?.disconnect()
		this.device = undefined
	}
}
