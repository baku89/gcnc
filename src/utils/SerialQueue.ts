import {withResolvers} from '../util.js'

interface Queue<T, U> {
	fn: (
		resolve: (value: T) => void,
		reject: (reason?: unknown) => void
	) => Promise<void>
	promise: Promise<T>
	resolve: (value: T) => void
	reject: (reason?: unknown) => void
	payload: U
}

/**
 * Manages device communication using a queue. Commands added to the queue are executed sequentially until the queue is empty. The queue advances when `resolveCurrent` or `rejectCurrent` is called in response to device responses.
 */
export class SerialQueue<T, U = void> {
	private queues: Queue<T, U>[] = []

	private runningQueue: Queue<T, U> | undefined

	get isRunning() {
		return this.runningQueue !== undefined
	}

	/**
	 * The size of the queue including the running queue
	 */
	get size() {
		return this.queues.length + (this.runningQueue ? 1 : 0)
	}

	get currentPayload(): U | undefined {
		return this.runningQueue?.payload
	}

	resolveCurrent(result: T) {
		if (!this.runningQueue) return

		this.runningQueue.resolve(result)
		this.runningQueue = undefined

		this.proceed()
	}

	rejectCurrent(reason?: unknown) {
		if (!this.runningQueue) return

		this.runningQueue.reject(reason)
		this.runningQueue = undefined

		this.proceed()
	}

	add(
		fn: (
			resolve: (value: T) => void,
			reject: (reason?: unknown) => void
		) => Promise<void>,
		payload: U
	) {
		const {promise, resolve, reject} = withResolvers<T>()

		this.queues.push({fn, promise, resolve, reject, payload})

		this.proceed()

		return promise
	}

	waitUntilSettled() {
		return Promise.allSettled(this.queues.map(queue => queue.promise))
	}

	clear() {
		this.queues = []
		this.runningQueue?.reject()
		this.runningQueue = undefined
	}

	private async proceed() {
		if (this.runningQueue) return

		this.runningQueue = this.queues.shift()

		this.runningQueue?.fn(this.runningQueue.resolve, this.runningQueue.reject)
	}
}
