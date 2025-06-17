/*
 * File: Cocoon/Source/Utility/CreateEventStream.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:55 UTC
 * Dependency: effect, vs/base/common/event.js
 * Export: EventStream
 */

/**
 * @module CreateEventStream
 * @description A utility to create a VS Code-compatible event emitter that is also an Effect PubSub.
 */

import { Effect, PubSub } from "effect";
import { Emitter, type Event } from "vs/base/common/event.js";

export interface EventStream<T> {
	/**
	 * Fires an event to all listeners.
	 * @param Data The event data.
	 * @returns An `Effect` that completes when the event has been published.
	 */
	readonly Fire: (Data: T) => Effect.Effect<void, never>;
	/**
	 * The underlying Effect PubSub for stream processing.
	 */
	readonly PubSub: PubSub.PubSub<T>;
	/**
	 * The VS Code-compatible `Event` interface.
	 */
	readonly event: Event<T>;
	/**
	 * Shuts down the underlying PubSub, completing the stream.
	 */
	readonly Shutdown: () => Effect.Effect<void, never>;
}

/**
 * Creates a new EventStream.
 * @returns An `EventStream` object.
 */
const CreateEventStream = <T>(): EventStream<T> => {
	const VscodeEmitter = new Emitter<T>();
	const PubSubInstance = Effect.runSync(PubSub.unbounded<T>());

	const Fire = (Data: T): Effect.Effect<void, never> =>
		PubSub.publish(PubSubInstance, Data).pipe(
			Effect.andThen(Effect.sync(() => VscodeEmitter.fire(Data))),
			Effect.asVoid,
		);

	const event: Event<T> = VscodeEmitter.event;
	const Shutdown = () => PubSub.shutdown(PubSubInstance);

	return {
		Fire,
		PubSub: PubSubInstance,
		event,
		Shutdown,
	};
};

export default CreateEventStream;
