import {EventEmitter} from 'eventemitter3'
import fromCallback from 'p-from-callback'

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

interface RecurringQueue {
	fn: () => Promise<void>
	lastRun: number
	interval: number
	pending: boolean
}

export interface SerialQueueEvents {
	/**
	 * Emitted every time the queue becomes empty.
	 */
	empty: () => void
	/**
	 * Returns a promise that settles when the queue becomes empty, and all promises have completed. The difference with 'empty' is that 'idle' guarantees that all work from the queue has finished. 'empty' merely signals that the queue is empty, but it could mean that some promises haven't completed yet.
	 */
	idle: () => void
}

/**
 * Manages device communication using a queue and Promises. Commands added to the queue are executed sequentially until the queue is empty. The queue advances when `resolvePending` or `rejectPending` is called in response to device responses.
 * @template T - The type of the result of the queue
 * @template P - The type of the payload which is associated with the queue
 */
export class SerialQueue<
	T = void,
	P = void,
> extends EventEmitter<SerialQueueEvents> {
	private queues: Queue<T, P>[] = []
	private pendingQueue: Queue<T, P> | undefined

	private recurringQueues: RecurringQueue[] = []
	private checkRecurringQueuesIntervalId: NodeJS.Timeout | undefined

	/**
	 * Creates a new SerialQueue instance.
	 */
	constructor() {
		super()

		this.checkRecurringQueues()
	}

	/**
	 * Whether the queue is currently processing an item.
	 * @returns True if there is a pending queue item being processed, false otherwise.
	 */
	get isPending() {
		return this.pendingQueue !== undefined
	}

	/**
	 * The total number of items in the queue, including the currently processing item.
	 * @returns The size of the queue.
	 */
	get size() {
		return this.queues.length + (this.pendingQueue ? 1 : 0)
	}

	/**
	 * The payload associated with the currently processing queue item.
	 * @returns The current payload or undefined if no item is being processed.
	 */
	get currentPayload(): P | undefined {
		return this.pendingQueue?.payload
	}

	/**
	 * Resolves the currently processing queue item with the given result.
	 * @param result - The result value to resolve with.
	 */
	resolvePending(result: T) {
		if (!this.pendingQueue) return

		this.pendingQueue.resolve(result)
		this.pendingQueue = undefined
		this.proceed()
	}

	/**
	 * Rejects the currently processing queue item with the given reason.
	 * @param reason - The reason for rejection.
	 */
	rejectPending(reason?: unknown) {
		if (!this.pendingQueue) return

		this.pendingQueue.reject(reason)
		this.pendingQueue = undefined
		this.proceed()
	}

	/**
	 * Adds a new item to the queue.
	 * @param fn - Function to execute when the queue item runs.
	 * @param payload - Associated payload data.
	 * @returns A promise that resolves when the queue item completes.
	 */
	add(
		fn: (
			resolve: (value: T) => void,
			reject: (reason?: unknown) => void
		) => Promise<void>,
		payload: P
	) {
		const {promise, resolve, reject} = withResolvers<T>()
		const queue: Queue<T, P> = {
			fn,
			promise,
			resolve,
			reject,
			payload,
		}

		this.queues.push(queue)
		this.proceed()

		return promise
	}

	/**
	 * Adds a recurring item to the queue that will execute periodically.
	 * @param fn - Function to execute periodically.
	 * @param interval - Time in milliseconds between executions.
	 */
	addRecurring(fn: () => Promise<void>, interval: number) {
		this.recurringQueues.push({fn, lastRun: 0, interval, pending: false})
	}

	/**
	 * Returns a promise that resolves when the queue becomes empty and all promises have completed.
	 * @returns A promise that resolves when the queue is idle.
	 */
	onIdle() {
		return fromCallback<void>(cb => this.once('idle', () => cb(null)))
	}

	/**
	 * Returns a promise that resolves when the queue becomes empty.
	 * @returns A promise that resolves when the queue is empty.
	 */
	onEmpty() {
		return fromCallback<void>(cb => this.once('empty', () => cb(null)))
	}

	/**
	 * Clears all items from the queue and rejects any pending promises.
	 */
	clear() {
		this.queues.forEach(queue => queue.reject())
		this.queues = []

		this.pendingQueue?.reject()
		this.pendingQueue = undefined
	}

	/**
	 * Terminates the queue, clearing all items and stopping recurring tasks.
	 * Should be called when the queue is no longer needed.
	 * @returns A promise that resolves when the queue is idle.
	 */
	terminate() {
		clearInterval(this.checkRecurringQueuesIntervalId)
		this.clear()
		return this.onIdle()
	}

	private async proceed() {
		if (this.pendingQueue) return

		if (this.recurringQueues.length === 0) {
			this.emit('idle')
		} else if (this.recurringQueues.length === 1) {
			this.emit('empty')
		}

		this.pendingQueue = this.queues.shift()
		this.pendingQueue?.fn(this.pendingQueue.resolve, this.pendingQueue.reject)
	}

	private checkRecurringQueues() {
		this.checkRecurringQueuesIntervalId = setInterval(() => {
			const now = Date.now()

			this.recurringQueues.forEach(queue => {
				if (queue.pending) return
				if (now - queue.lastRun < queue.interval) return

				queue.pending = true
				queue.fn().finally(() => {
					queue.pending = false
					queue.lastRun = now
				})
			})
		}, 1000 / 16)
	}
}
