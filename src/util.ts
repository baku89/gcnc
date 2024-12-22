import crypto from 'node:crypto'

import fs from 'fs/promises'

export const withResolvers = function <T>() {
	let resolve: (value: T | PromiseLike<T>) => void
	let reject: (reason?: unknown) => void

	const promise = new Promise<T>((res, rej) => {
		resolve = res
		reject = rej
	})

	return {promise, resolve: resolve!, reject: reject!}
}
export async function countTotalLines(iter: AsyncIterable<unknown>) {
	let totalLines = 0
	for await (const _ of iter) {
		totalLines++
	}
	return totalLines
}

export function getLastLine(
	cache: Record<string, {lastLine: number}>,
	hash: string,
	port: string
): number {
	const entry = cache[`${hash}:${port}`]
	return entry?.lastLine ?? 1
}

export async function getFileHash(filePath: string): Promise<string> {
	const content = await fs.readFile(filePath)
	return crypto.createHash('md5').update(content).digest('hex')
}
