import {describe, expect, it} from 'vitest'

import {parseGCode} from './parseGCode.js'

describe('parseGCode', () => {
	it('should parse G0 X10 Y20', () => {
		const gcode = parseGCode('G0 X10 Y20')
		expect(gcode).toEqual({command: 'G0', x: 10, y: 20})
	})

	it('should parse empty line', () => {
		const gcode = parseGCode('')
		expect(gcode).toEqual(null)
	})

	it('should parse M106 S204', () => {
		const gcode = parseGCode('M106 S204')
		expect(gcode).toEqual({command: 'M106'})
	})

	it('should parse G-code with comment', () => {
		const gcode = parseGCode('G1 X10 Y20 ; This is a comment')
		expect(gcode).toEqual({
			command: 'G1',
			x: 10,
			y: 20,
			comment: ' This is a comment',
		})
	})

	it('should parse only comment', () => {
		const gcode = parseGCode('; This is a comment')
		expect(gcode).toEqual({comment: ' This is a comment'})
	})
})
