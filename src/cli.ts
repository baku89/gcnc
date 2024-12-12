#!/usr/bin/env node

import {sendGCode, type GCodeSource} from './index.js'
import yargs from 'yargs'
import {hideBin} from 'yargs/helpers'
import fs from 'node:fs'
import readline from 'node:readline'

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

const source: GCodeSource = async () => {
	const fileStream = fs.createReadStream(argv.file, {encoding: 'utf-8'})
	const rl = readline.createInterface({
		input: fileStream,
		crlfDelay: Infinity,
	})

	// Skip lines if requested
	if (argv.linenumber) {
		let currentLine = 0
		for await (const _ of rl) {
			if (++currentLine >= argv.linenumber) {
				break
			}
		}
	}

	return rl
}

await sendGCode(source, argv.port, (argv.linenumber ?? 1) - 1)

// Quit the process after sending the G-code
process.exit(0)
