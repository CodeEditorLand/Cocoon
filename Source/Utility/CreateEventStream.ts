/**
 * @module CreateEventStream
 * @description A utility to create a VS Code-compatible event emitter.
 */

import { Effect, Hub } from "effect";
import { Emitter, type Event } from "vs/base/common/event.js";

export interface EventStream<T> {
	/**
	 * Fires an event to all listeners.
	 * @param Data The event data.
	 * @returns An `Effect` that completes when the event has been published.
	 */
	readonly Fire: (Data: T) => Effect.Effect<void, never>;
	/**
	 * The underlying Effect Hub for stream processing.
	 */
	readonly Hub: Hub.Hub<T>;
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
const CreateEventStream = <T>(): EventStream<T> => {
	const VscodeEmitter = new Emitter<T>();
	const HubInstance = Effect.runSync(Hub.unbounded<T>());

	const Fire = (Data: T): Effect.Effect<void, never> =>
		Hub.publish(HubInstance, Data).pipe(
			Effect.andThen(Effect.sync(() => VscodeEmitter.fire(Data))),
			Effect.asVoid,
		);

	const event: Event<T> = VscodeEmitter.event;
	const Shutdown = () => Hub.shutdown(HubInstance);

	return {
		Fire,
		Hub: HubInstance,
		event,
		Shutdown,
	};
};

export default CreateEventStream;
