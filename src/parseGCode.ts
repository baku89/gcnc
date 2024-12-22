import {type GCode} from './type.js'

export function parseGCode(line: string): GCode | null {
	const [command, ...args] = line.split(/\s+/)

	const parsed: GCode = {command}

	for (const arg of args) {
		const axis = arg[0].toLowerCase()
		const value = Number(arg.slice(1))

		if (/^[xyzabc]$/.test(axis)) {
			// @ts-expect-error: Axis should be correct
			parsed[axis] = value
		} else if (/^f$/.test(axis)) {
			parsed.feedRate = value
		}
	}

	return parsed
}
