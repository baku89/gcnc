export interface GCode {
	/**
	 * The command to send to the CNC machine.
	 * e.g. `G0`, `G1`, `G90`, `G91`, etc.
	 */
	command: string
	x?: number
	y?: number
	z?: number
	a?: number
	b?: number
	c?: number
	feedRate?: number
}

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
