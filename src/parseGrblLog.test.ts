import {describe, expect, it} from 'vitest'

import {parseGrblLog} from './parseGrblLog.js'

describe('parseGrblLog', () => {
	it('should parse log [MSG:ALARM: Alarm!]', () => {
		const log = parseGrblLog('[MSG:ALARM: Alarm!]')
		expect(log).toEqual({type: 'error', message: 'Alarm!'})
	})

	it('should parse log [MSG:RST]', () => {
		const log = parseGrblLog('[MSG:RST]')
		expect(log).toEqual({type: 'reset', message: ''})
	})

	it('should parse log [MSG:INFO: Axis A (-1000.000,0.000)]', () => {
		const log = parseGrblLog('[MSG:INFO: Axis A (-1000.000,0.000)]')
		expect(log).toEqual({type: 'info', message: 'Axis A (-1000.000,0.000)'})
	})
})
