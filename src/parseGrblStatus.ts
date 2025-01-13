import {type AxesPosition, type CNCStatus} from './type.js'

export function parseGrblStatus(line: string): CNCStatus {
	// <Run|MPos:200.000,31.070,0.000,0.000|FS:5000,0>
	const match = line.trim().match(/^<(.+)>$/)
	if (!match) {
		console.error([line])
		throw new Error(`Invalid status format. Got: ${line}`)
	}

	const [, content] = match
	const fields = content.split('|')
	const stateStr = fields[0]
	const status: CNCStatus = parseState(stateStr)

	// 各フィールドをパース
	for (const field of fields.slice(1)) {
		const [type, value] = field.split(':')

		switch (type) {
			case 'MPos':
				status.position = parsePosition(value)
				break
			case 'WCO':
				status.workCoordOffset = parsePosition(value)
				break
			case 'FS': {
				const [feed, spindle] = value.split(',').map(Number)
				status.feedRate = feed
				status.spindleSpeed = spindle
				break
			}
			case 'Bf': {
				const [planner, rx] = value.split(',').map(Number)
				status.buffer = {planner, rx}
				break
			}
			case 'Ln':
				status.lineNumber = Number(value)
				break
			case 'Ov': {
				const [feedOv, rapidOv, spindleOv] = value.split(',').map(Number)
				status.override = {feed: feedOv, rapid: rapidOv, spindle: spindleOv}
				break
			}
			case 'Pn':
				status.pins = parsePins(value)
				break
			case 'A':
				status.accessories = parseAccessories(value)
				break
		}
	}

	return status
}

function parseState(state: string): CNCStatus {
	const [mainState, subState] = state.split(':')
	return {
		state: mainState,
		subState: subState ? Number(subState) : undefined,
		position: {x: 0},
		feedRate: 0,
		spindleSpeed: 0,
	}
}

function parsePosition(pos: string): AxesPosition {
	const [x, y, z, a, b, c] = pos.split(',').map(Number)
	return {
		x,
		...(y !== undefined && {y}),
		...(z !== undefined && {z}),
		...(a !== undefined && {a}),
		...(b !== undefined && {b}),
		...(c !== undefined && {c}),
	}
}

function parsePins(pins: string): CNCStatus['pins'] {
	return {
		limitX: pins.includes('X'),
		limitY: pins.includes('Y'),
		limitZ: pins.includes('Z'),
		probe: pins.includes('P'),
		door: pins.includes('D'),
		hold: pins.includes('H'),
		reset: pins.includes('R'),
		start: pins.includes('S'),
	}
}

function parseAccessories(acc: string): CNCStatus['accessories'] {
	return {
		spindleCW: acc.includes('S'),
		spindleCCW: acc.includes('C'),
		flood: acc.includes('F'),
		mist: acc.includes('M'),
	}
}
