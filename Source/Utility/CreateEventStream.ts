/*
 * File: Cocoon/Source/Utility/CreateEventStream.ts
 * Role: A utility for creating a hybrid event emitter that bridges Effect-TS PubSub
 *       with the VS Code Event API.
 * Responsibilities:
 *   - Create a `PubSub` for Effect-native stream processing.
 *   - Create a VS Code `Emitter` for compatibility with legacy APIs.
 *   - Provide a unified `Fire` method to publish events to both systems concurrently.
 *   - Encapsulate the shutdown logic for the underlying resources.
 */

import { Effect, PubSub } from "effect";
import { Emitter, type Event } from "vs/base/common/event.js";

/**
 * Defines the structure of a hybrid event stream, which combines the
 * capabilities of an Effect-TS `PubSub` and a VS Code `Event` emitter.
 */
export interface EventStream<T> {
	/**
	 * Fires an event to all listeners and subscribers.
	 * @param Data - The event data payload.
	 * @returns An `Effect` that completes when the event has been published to both systems.
	 */
	readonly Fire: (Data: T) => Effect.Effect<void, never>;

	/**
	 * The underlying Effect `PubSub` for reactive, stream-based consumption.
	 */
	readonly PubSub: PubSub.PubSub<T>;

	/**
	 * The VS Code-compatible `Event` interface for legacy listeners.
	 */
	readonly event: Event<T>;

	/**
	 * Creates an `Effect` that, when executed, shuts down the underlying `PubSub`
	 * and disposes of the VS Code `Emitter`, completing all associated streams
	 * and releasing resources.
	 */
	readonly Shutdown: () => Effect.Effect<void, never>;
}

/**
 * A factory function that creates a new `EventStream`.
 *
 * This utility is essential for creating services that need to expose events
 * compatible with both modern Effect-TS consumers (via `PubSub` and `Stream`)
 * and legacy VS Code components (via the `Event` interface).
 *
 * @returns An `EventStream<T>` object containing both emitter interfaces and control methods.
 */
export const CreateEventStream = <T>(): EventStream<T> => {
	const VscodeEmitter = new Emitter<T>();
	const PubSubInstance = Effect.runSync(PubSub.unbounded<T>());

	const Fire = (Data: T): Effect.Effect<void, never> =>
		PubSub.publish(PubSubInstance, Data).pipe(
			// Fire to the VS Code emitter after successfully publishing to the PubSub.
			Effect.andThen(Effect.sync(() => VscodeEmitter.fire(Data))),
			Effect.asVoid,
		);

	const Shutdown = () =>
		Effect.all([
			PubSub.shutdown(PubSubInstance),
			Effect.sync(() => VscodeEmitter.dispose()),
		]).pipe(Effect.asVoid);

	return {
		Fire,
		PubSub: PubSubInstance,
		event: VscodeEmitter.event,
		Shutdown,
	};
};
