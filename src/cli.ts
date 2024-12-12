#!/usr/bin/env node

import {sendGCode} from './index.js'
import yargs from 'yargs'
import {hideBin} from 'yargs/helpers'

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
	.help().argv

sendGCode(argv.file, argv.port)
