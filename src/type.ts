export interface GCode extends AxesPosition {
	/**
	 * The command to send to the CNC machine.
	 * e.g. `G0`, `G1`, `G90`, `G91`, etc.
	 */
	command: string
	feedRate?: number
}

export type GCodeSource = AsyncIterable<GCodeSourceLine>

export interface GCodeSourceLine {
	text: string
	number: number
}

export interface AxesPosition {
	x?: number
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
	position: AxesPosition
	// 作業座標系のオフセット
	workCoordOffset?: AxesPosition
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
