#!/usr/bin/env node

import yargs from 'yargs'
import {hideBin} from 'yargs/helpers'

import {CNCDeviceNodeSerialGrbl} from '../CNCDeviceGrbl.js'
import {bindWithOSC} from './bindWithOSC.js'
import {sendFromFile} from './sendFromFile.js'
import {startRepl} from './startRepl.js'

const argv = await yargs(hideBin(process.argv))
	.option('file', {
		alias: 'f',
		type: 'string',
		description: 'Path to the G-code file',
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
		type: 'number',
		description: 'OSC port to send to',
	})
	.option('osc-host', {
		default: 'localhost',
		type: 'string',
		description: 'OSC host to send to',
	})
	.help().argv

const device = new CNCDeviceNodeSerialGrbl(argv.port)

await device.open().catch(err => {
	const msg = err instanceof Error ? err.message : 'Unknown error'
	console.error(`Cannot open serial port ${argv.port}: ${msg}`)
	process.exit(1)
})

if (argv.oscPort) {
	await bindWithOSC(device, {port: argv.oscPort, host: argv.oscHost})
}

if (argv.file) {
	await sendFromFile(device, {
		port: argv.port,
		filePath: argv.file,
		startLine: argv.linenumber,
	})
} else {
	await startRepl(device)
}

// Quit the process after sending the G-code
process.exit(0)
