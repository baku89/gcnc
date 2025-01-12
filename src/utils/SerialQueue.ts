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
export class SerialQueue<T, U = void> {
	private queues: Queue<T, U>[] = []

	private runningQueue: Queue<T, U> | undefined

	get isRunning() {
		return this.runningQueue !== undefined
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

	private async proceed() {
		if (this.runningQueue) return

		this.runningQueue = this.queues.shift()
		if (!this.runningQueue) return

		this.runningQueue.fn(this.runningQueue.resolve, this.runningQueue.reject)
	}
}
