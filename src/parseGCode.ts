import {type GCode} from './type.js'

export function parseGCode(line: string): GCode | null {
	if (line.trim() === '') {
		return null
	}

	const [gcode, comment] = line.split(';')
	const [command, ...args] = gcode.trim().split(/\s+/)

	const parsed: GCode = {command: command || undefined, comment}

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
