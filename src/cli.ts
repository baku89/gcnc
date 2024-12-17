#!/usr/bin/env node

import fs from 'node:fs'
import readline from 'node:readline'

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
	.help().argv

const device = new SerialCNCDevice(argv.port)

await device.open().catch(err => {
	console.error(err)
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
