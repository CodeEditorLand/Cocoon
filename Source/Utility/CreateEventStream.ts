/**
 * @module CreateEventStream
 * @description A utility to create a VS Code-compatible event emitter from an Effect Hub.
 */

import { Effect, Hub, Stream } from "effect";
import { Emitter } from "vs/base/common/event.js";
import type { Disposable, Event } from "vscode";

export interface EventStream<T> {
	/**
	 * Fires an event to all listeners.
	 * @param data The event data.
	 * @returns An `Effect` that completes when the event has been published.
	 */
	readonly Fire: (data: T) => Effect.Effect<void, never>;
	/**
	 * The underlying Effect Stream.
	 */
	readonly Stream: Stream.Stream<T, never>;
	/**
	 * The VS Code-compatible `Event` interface.
	 */
	readonly event: Event<T>;
	/**
	 * Shuts down the underlying Hub, completing the stream.
	 */
	readonly Shutdown: () => Effect.Effect<void, never>;
}

/**
 * Creates a new EventStream.
 * @returns An `EventStream` object.
 */
export function CreateEventStream<T>(): EventStream<T> {
	// VS Code's Emitter is a reliable and simple way to implement the Event interface.
	const VscodeEmitter = new Emitter<T>();
	const HubInstance = Effect.runSync(Hub.unbounded<T>());

	const Fire = (data: T): Effect.Effect<void, never> =>
		Hub.publish(HubInstance, data).pipe(Effect.asVoid);

	// We also fire the vscode emitter to ensure the `.event` property works correctly.
	const FireWithVscode = (data: T) =>
		Effect.sync(() => VscodeEmitter.fire(data)).pipe(
			Effect.andThen(() => Fire(data)),
		);

	const event: Event<T> = VscodeEmitter.event;
	const StreamFromHub = Stream.fromHub(HubInstance);
	const Shutdown = () => Hub.shutdown(HubInstance);

	return {
		Fire: FireWithVscode,
		Stream: StreamFromHub,
		event,
		Shutdown,
	};
}
