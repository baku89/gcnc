#!/usr/bin/env node

import fs from 'node:fs'
import readline from 'node:readline'

import OSC from 'osc-js'
import yargs from 'yargs'
import {hideBin} from 'yargs/helpers'

import {bindWithOSC} from './bindWithOSC.js'
import {SerialCNCDevice} from './CNCDevice.js'
import {FileCache} from './FileCache.js'
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
	.option('osc-host', {
		default: 'localhost',
		type: 'string',
		description: 'OSC host to send to',
	})
	.help().argv

const osc = new OSC({
	plugin: new OSC.DatagramPlugin({
		// @ts-expect-error: osc-js is not typed correctly
		send: {port: argv.oscPort, host: argv.oscHost},
	}),
})

console.log(`Launching OSC server on port ${argv.oscPort}`)

osc.on('open', () => {
	console.log(`OSC server is running on port ${argv.oscPort}`)
})

// await new Promise<void>(resolve => osc.on('open', resolve))

osc.open()

const device = new SerialCNCDevice(argv.port, {checkStatusInterval: 50})
const fileCache = new FileCache()
await fileCache.load()

const fileHash = await fileCache.getFileHash(argv.file)
const startLine = argv.linenumber ?? fileCache.getLastLine(fileHash, argv.port)

if (startLine > 1) {
	console.log(`Resuming from line ${startLine}`)
}

await device.open().catch(err => {
	const msg = err instanceof Error ? err.message : 'Unknown error'
	console.error(`Cannot open serial port ${argv.port}: ${msg}`)
	process.exit(1)
})

bindWithOSC(device, osc)

const source = async (preventSkip = false): Promise<GCodeSource> => {
	const fileStream = fs.createReadStream(argv.file)
	const rl = readline.createInterface({
		input: fileStream,
		crlfDelay: Infinity,
	})

	const generator = async function* () {
		let currentLine = 1
		for await (const text of rl) {
			if (currentLine < startLine && !preventSkip) {
				currentLine++
				continue
			}
			yield {text, number: currentLine++}
		}
	}

	return generator()
}

const totalLines = await countTotalLines(await source(true))

device.on('sent', ({command}, {number}) => {
	if (command === 'G0') {
		fileCache.setLastLine(fileHash, argv.port, number)
		fileCache.save().catch(console.error)
	}
})

// If the messaging starts from the middle of the file,
// send G90 to set the absolute mode
if (startLine > 1) {
	await device.send('G90')
}

await device.sendLines(await source(), totalLines)

// Quit the process after sending the G-code
process.exit(0)
