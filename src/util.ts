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
