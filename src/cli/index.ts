#!/usr/bin/env node

import yargs from 'yargs'
import {hideBin} from 'yargs/helpers'

import {CNCDevice} from '../CNCDevice.js'
import {CNCDeviceBambu} from '../CNCDeviceBambu.js'
import {
	CNCDeviceNodeSerialGrbl,
	CNCDeviceWebSocketGrbl,
} from '../CNCDeviceGrbl.js'
import {bindWithOSC} from './bindWithOSC.js'
import {sendFromFile} from './sendFromFile.js'
import {startRepl} from './startRepl.js'

const argv = await yargs(hideBin(process.argv))
	.option('file', {
		alias: 'f',
		type: 'string',
		description: 'Path to the G-code file',
	})
	.option('linenumber', {
		alias: 'n',
		type: 'number',
		description: 'Line number to start from',
	})
	// One-liner options
	.option('run', {
		alias: 'r',
		type: 'string',
		description:
			'Run a one-liner command. Multiple commands can be separated by `&`',
	})
	// Serial port
	.option('port', {
		alias: 'p',
		type: 'string',
		description: 'Serial port to use',
	})
	// WebSocket
	.option('ws', {
		type: 'string',
		description: 'WebSocket url to send to',
	})
	// Bambu Lab
	.option('bambu-host', {
		type: 'string',
		description: 'Bambu Lab host to send to',
	})
	.option('bambu-access-code', {
		type: 'string',
		description: 'Bambu Lab access code to send to',
	})
	.option('bambu-serial-number', {
		type: 'string',
		description: 'Bambu Lab serial number to send to',
	})
	// OSC
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

let device: CNCDevice

if (argv.port) {
	device = new CNCDeviceNodeSerialGrbl(argv.port)
} else if (argv.ws) {
	device = new CNCDeviceWebSocketGrbl(argv.ws)
} else if (argv.bambuHost || argv.bambuAccessCode || argv.bambuSerialNumber) {
	if (!argv.bambuHost || !argv.bambuAccessCode || !argv.bambuSerialNumber) {
		console.error(
			'All of bambu options (--bambu-host, --bambu-access-code, --bambu-serial-number) are required'
		)
		process.exit(1)
	}

	device = new CNCDeviceBambu({
		host: argv.bambuHost,
		accessCode: argv.bambuAccessCode,
		serialNumber: argv.bambuSerialNumber,
	})
} else {
	console.error('No device specified')
	process.exit(1)
}

await device.open().catch(err => {
	const msg = err instanceof Error ? err.message : 'Unknown error'
	console.error(`Cannot open the device: ${msg}`)
	process.exit(1)
})

if (argv.oscPort) {
	await bindWithOSC(device, {port: argv.oscPort, host: argv.oscHost})
}

if (argv.run) {
	const commands = argv.run.split('&').map(cmd => cmd.trim())
	for (const command of commands) {
		await device.send(command)
	}
} else if (argv.file) {
	await sendFromFile(device, {
		filePath: argv.file,
		startLine: argv.linenumber,
	})
} else {
	await startRepl(device)
}

// Quit the process after sending the G-code
process.exit(0)
