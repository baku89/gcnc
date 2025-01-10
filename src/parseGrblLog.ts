import {CNCLog} from './type.js'

const logRegex = /^\s*\[MSG:(.+?)(?:: (.+?))?\]\s*$/

export function parseGrblLog(line: string): CNCLog {
	const log = logRegex.exec(line)
	if (!log) {
		throw new Error('Invalid log format')
	}

	const [, type, message] = log

	return {
		type: type === 'ALARM' ? 'error' : type === 'RST' ? 'reset' : 'info',
		message: message ?? '',
	}
}
