import fs from 'node:fs'
import readline from 'node:readline'

import {CNCDevice} from '../CNCDevice.js'
import {FileCache} from '../FileCache.js'
import {type GCodeSource} from '../type.js'
import {countTotalLines} from '../util.js'

export async function sendFromFile(
	device: CNCDevice,
	{filePath, startLine = 1}: {filePath: string; startLine?: number}
) {
	const fileCache = new FileCache()
	await fileCache.load()

	const fileHash = await fileCache.getFileHash(filePath)
	startLine ??= fileCache.getLastLine(fileHash)

	const source = async (preventSkip = false): Promise<GCodeSource> => {
		const fileStream = fs.createReadStream(filePath)
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
			fileCache.setLastLine(fileHash, number)
			fileCache.save().catch(console.error)
		}
	})

	await device.sendLines(await source(), totalLines)
}
