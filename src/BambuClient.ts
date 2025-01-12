import {createId} from '@paralleldrive/cuid2'
import mqtt from 'mqtt'
import {MqttClient} from 'mqtt'

import {BambuClientOptions} from './BambuClientOptions.js'

/**
 * Manages connectivity and messages from/to the printer.
 */
export class BambuClient {
	public id: string = createId()

	private mqttClient: mqtt.MqttClient | undefined = undefined

	public config

	public constructor(public readonly clientOptions: BambuClientOptions) {
		this.config = {
			host: clientOptions.host,
			port: clientOptions.port ?? 8883,
			accessToken: clientOptions.accessToken,
			serialNumber: clientOptions.serialNumber,
			throwOnOfflineCommands: clientOptions.throwOnOfflineCommands ?? false,
			reconnectInterval: clientOptions.reconnectInterval ?? 1000,
			connectTimeout: clientOptions.connectTimeout ?? 2000,
			keepAlive: clientOptions.keepAlive ?? 20,
		}
	}

	private async connectMQTT() {
		return new Promise<void>(resolve => {
			// make sure that we are not already connected
			if (this.mqttClient)
				throw new Error(
					"Can't establish a new connection while running another one!"
				)

			this.mqttClient = mqtt.connect(
				`mqtts://${this.config.host}:${this.config.port}`,
				{
					username: 'bblp',
					password: this.config.accessToken,
					reconnectPeriod: this.clientOptions.reconnectInterval,
					connectTimeout: this.clientOptions.connectTimeout,
					keepalive: this.clientOptions.keepAlive,
					resubscribe: true,
					rejectUnauthorized: false,
				}
			)

			this.mqttClient.on('connect', () => {
				resolve()
			})
		})
	}

	/**
	 * Connect to the printer.
	 */
	public async connect() {
		return await Promise.all([this.connectMQTT()])
	}

	/**
	 * Disconnect from the printer.
	 * @param force Forcefully disconnect.
	 * @param options {Parameters<MqttClient["end"]>[1]} MQTT client options
	 */
	public async disconnect(
		force = false,
		options?: Parameters<MqttClient['end']>[1]
	) {
		return new Promise(resolve => this.mqttClient?.end(force, options, resolve))
	}
}
