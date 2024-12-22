#!/usr/bin/env node

import fs from 'node:fs'
import readline from 'node:readline'

import OSC from 'osc-js'
import yargs from 'yargs'
import {hideBin} from 'yargs/helpers'

import {SerialCNCDevice} from './CNCDevice.js'
import {type GCodeSource} from './type.js'
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
		// @ts-expect-error: osc-js is not typed correctly
		send: {port: argv.oscPort},
	}),
})

console.log(`Launching OSC server on port ${argv.oscPort}`)

osc.on('open', () => {
	console.log(`OSC server is running on port ${argv.oscPort}`)
})

osc.open()

const device = new SerialCNCDevice(argv.port, {checkStatusInterval: 50})

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
		for await (const text of rl) {
			yield {text, number: ++currentLine}
		}
	}

	return generator()
}

const totalLines = await countTotalLines(await source())

await device.sendLines(await source(), totalLines)

// Quit the process after sending the G-code
process.exit(0)
