interface GrblPosition {
	x: number
	y?: number
	z?: number
	a?: number
	b?: number
	c?: number
}

export interface GrblStatus {
	// Idle, Run, Hold, Jog, Alarm, Door, Check, Home, Sleep
	state: string
	// Hold:0, Hold:1, Door:0-3 などのサブステート
	subState?: number
	// 機械座標系の位置
	position: GrblPosition
	// 作業座標系のオフセット
	workCoordOffset?: GrblPosition
	// 送り速度(mm/min or inch/min)
	feedRate: number
	// 主軸回転数(RPM)
	spindleSpeed: number
	// バッファの状態
	buffer?: {
		planner: number // プランナーバッファの空きブロック数
		rx: number // シリアルRXバッファの空きバイト数
	}
	// 実行中の行番号
	lineNumber?: number
	// オーバーライド値(%)
	override?: {
		feed: number
		rapid: number
		spindle: number
	}
	// 入力ピンの状態
	pins?: {
		limitX: boolean // X軸リミット
		limitY: boolean // Y軸リミット
		limitZ: boolean // Z軸リミット
		probe: boolean // プローブ
		door: boolean // ドア
		hold: boolean // ホールド
		reset: boolean // ソフトリセット
		start: boolean // サイクルスタート
	}
	// アクセサリの状態
	accessories?: {
		spindleCW: boolean // 主軸CW回転
		spindleCCW: boolean // 主軸CCW回転
		flood: boolean // クーラント(フラッド)
		mist: boolean // クーラント(ミスト)
	}
}

export function parseGrblStatus(line: string): GrblStatus {
	// <Run|MPos:200.000,31.070,0.000,0.000|FS:5000,0>
	const match = line.match(/^<(.+)>$/)
	if (!match) {
		console.error([line])
		throw new Error(`Invalid status format. Got: ${line}`)
	}

	const [, content] = match
	const fields = content.split('|')
	const stateStr = fields[0]
	const status: GrblStatus = parseState(stateStr)

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

function parseState(state: string): GrblStatus {
	const [mainState, subState] = state.split(':')
	return {
		state: mainState,
		subState: subState ? Number(subState) : undefined,
		position: {x: 0},
		feedRate: 0,
		spindleSpeed: 0,
	}
}

function parsePosition(pos: string): GrblPosition {
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

function parsePins(pins: string): GrblStatus['pins'] {
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

function parseAccessories(acc: string): GrblStatus['accessories'] {
	return {
		spindleCW: acc.includes('S'),
		spindleCCW: acc.includes('C'),
		flood: acc.includes('F'),
		mist: acc.includes('M'),
	}
}
