import fs from 'fs/promises'
import path from 'path'

import {getFileHash} from './util.js'

interface CacheEntry {
	hash: string
	port: string
	lastLine: number
	timestamp: number
}

export class FileCache {
	private cacheFile: string
	private cache: Record<string, CacheEntry> = {}

	constructor(cacheDir = '.gcache') {
		this.cacheFile = path.join(cacheDir, 'progress.json')
	}

	async load() {
		try {
			await fs.mkdir(path.dirname(this.cacheFile), {recursive: true})
			const data = await fs.readFile(this.cacheFile, 'utf-8')
			this.cache = JSON.parse(data)
		} catch {
			this.cache = {}
		}
	}

	async save() {
		await fs.writeFile(this.cacheFile, JSON.stringify(this.cache, null, 2))
	}

	async getFileHash(filePath: string): Promise<string> {
		return getFileHash(filePath)
	}

	getLastLine(hash: string, port: string): number {
		const entry = this.cache[`${hash}:${port}`]
		return entry?.lastLine ?? 1
	}

	setLastLine(hash: string, port: string, line: number) {
		this.cache[`${hash}:${port}`] = {
			hash,
			port,
			lastLine: line,
			timestamp: Date.now(),
		}
	}
}
