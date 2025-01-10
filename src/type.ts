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

export interface CNCStatus {
	// Idle, Run, Hold, Jog, Alarm, Door, Check, Home, Sleep
	state: string
	// Sub-state like Hold:0, Hold:1, Door:0-3
	subState?: number
	// Machine coordinate system position
	position: AxesPosition
	// Work coordinate system offset
	workCoordOffset?: AxesPosition
	// Feed rate (mm/min or inch/min)
	feedRate: number
	// Spindle speed (RPM)
	spindleSpeed: number
	// Buffer status
	buffer?: {
		planner: number // Number of available blocks in planner buffer
		rx: number // Number of available bytes in serial RX buffer
	}
	// Current line number being executed
	lineNumber?: number
	// Override values (%)
	override?: {
		feed: number
		rapid: number
		spindle: number
	}
	// Input pin states
	pins?: {
		limitX: boolean // X axis limit
		limitY: boolean // Y axis limit
		limitZ: boolean // Z axis limit
		probe: boolean // Probe
		door: boolean // Door
		hold: boolean // Hold
		reset: boolean // Soft reset
		start: boolean // Cycle start
	}
	// Accessory states
	accessories?: {
		spindleCW: boolean // Spindle clockwise rotation
		spindleCCW: boolean // Spindle counter-clockwise rotation
		flood: boolean // Coolant (flood)
		mist: boolean // Coolant (mist)
	}
}

export interface CNCLog {
	type: 'error' | 'info' | 'reset'
	message: string
}
