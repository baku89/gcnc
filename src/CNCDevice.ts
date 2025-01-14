import {EventEmitter} from 'eventemitter3'

import {parseGCode} from './parseGCode.js'
import type {
	CNCLog,
	CNCStatus,
	GCode,
	GCodeSource,
	GCodeSourceLine,
} from './type.js'

export interface CNCDeviceEvents {
	status: (status: CNCStatus) => void
	sent: (gcode: GCode, line: GCodeSourceLine) => void
	message: (message: string, interrupted: boolean) => void
	log: (log: CNCLog) => void
	connect: () => void
	disconnect: () => void
}

export abstract class CNCDevice extends EventEmitter<CNCDeviceEvents> {
	abstract get isOpen(): boolean

	abstract open(): Promise<void>

	abstract close(): Promise<void>

	abstract send(line: string, emitMessage?: boolean): Promise<void>

	/**
	 * Run the homing sequence.
	 * @param axes The axes to home. If not specified, all axes will be homed.
	 */
	abstract home(axes?: string[]): Promise<void>

	abstract reset(): Promise<void>

	abstract pause(): Promise<void>

	abstract resume(): Promise<void>

	/**
	 * Send multiple lines of G-code.
	 * @param source The source of the G-code.
	 * @param totalLines The total number of lines to send.
	 * @returns A promise that resolves when all lines are sent.
	 */
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
