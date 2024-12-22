#!/usr/bin/env node

import fs from 'node:fs'
import readline from 'node:readline'

import OSC from 'osc-js'
import yargs from 'yargs'
import {hideBin} from 'yargs/helpers'

import {GCodeSource, SerialCNCDevice} from './CNCDevice.js'
import {countTotalLines} from './util.js'

const argv = await yargs(hideBin(process.argv))
	.option('file', {
		alias: 'f',
		type: 'string',
		description: 'Path to the G-code file',
		demandOption: true,
	})
	.option('port', {
		alias: 'p',
		type: 'string',
		description: 'Serial port to use',
		demandOption: true,
	})
	.option('linenumber', {
		alias: 'n',
		type: 'number',
		description: 'Line number to start from',
	})
	.option('osc-port', {
		default: 8080,
		type: 'number',
		description: 'OSC port to send to',
	})
	.help().argv

const osc = new OSC({
	plugin: new OSC.DatagramPlugin({
		// @ts-expect-error: osc-js is not typed
		send: {port: argv.oscPort},
	}),
})

console.log(`Launching OSC server on port ${argv.oscPort}`)

osc.on('open', () => {
	console.log(`OSC server is running on port ${argv.oscPort}`)
})

osc.open()

const device = new SerialCNCDevice(argv.port, {checkStatusInterval: 50})

device.on('status', status => {
	if (!osc) return

	// 軸位置の送信
	const axes = [
		status.position.x,
		status.position.y ?? 0,
		status.position.z ?? 0,
		status.position.a ?? 0,
		status.position.b ?? 0,
		status.position.c ?? 0,
	]

	osc.send(new OSC.Message('/gcnc/report/axes', ...axes))

	// ステータスの送信
	osc.send(new OSC.Message('/gcnc/report/status', status.state))

	// 送り速度の送信
	osc.send(new OSC.Message('/gcnc/report/feedRate', status.feedRate ?? 0))
})

// Gコード送信時のハンドラ
device.on('sent', gcode => {
	if (!osc) return

	// 送信したコマンドの通知
	const axes = [
		gcode.x ?? 0,
		gcode.y ?? 0,
		gcode.z ?? 0,
		gcode.a ?? 0,
		gcode.b ?? 0,
		gcode.c ?? 0,
	]

	osc.send(new OSC.Message('/gcnc/sent/axes', ...axes))
	osc.send(new OSC.Message('/gcnc/sent/command', gcode.command))
	osc.send(new OSC.Message('/gcnc/sent/feedRate', gcode.feedRate ?? 0))
})

await device.open().catch(err => {
	const msg = err instanceof Error ? err.message : 'Unknown error'
	console.error(`Cannot open serial port ${argv.port}: ${msg}`)
	process.exit(1)
})

const source = async (): Promise<GCodeSource> => {
	const fileStream = fs.createReadStream(argv.file)
	const rl = readline.createInterface({
		input: fileStream,
		crlfDelay: Infinity,
	})

	const generator = async function* () {
		let currentLine = 0
		for await (const command of rl) {
			yield {command, number: ++currentLine}
		}
	}

	return generator()
}

const totalLines = await countTotalLines(await source())

await device.sendLines(await source(), totalLines)

// Quit the process after sending the G-code
process.exit(0)
