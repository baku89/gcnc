#!/usr/bin/env node

import yargs from 'yargs'
import {hideBin} from 'yargs/helpers'

import {CNCDevice} from '../CNCDevice.js'
import {CNCDeviceBambu} from '../CNCDeviceBambu.js'
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
	.help().argv

let device: CNCDevice

if (argv.port) {
	device = new CNCDeviceNodeSerialGrbl(argv.port)
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

if (argv.file) {
	await sendFromFile(device, {
		filePath: argv.file,
		startLine: argv.linenumber,
	})
} else {
	await startRepl(device)
}

// Quit the process after sending the G-code
process.exit(0)
