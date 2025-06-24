/**
 * @module CreateEventStream
 * @description A utility for creating a hybrid event emitter that bridges Effect-TS
 * PubSub with the VS Code Event API.
 */

import { Effect, PubSub } from "effect";
import { Emitter, type Event } from "vs/base/common/event.js";

/**
 * @interface EventStream
 * @description Defines the structure of a hybrid event stream.
 */
export interface EventStream<T> {
	readonly Fire: (Data: T) => Effect.Effect<void, never>;
	readonly PubSub: PubSub.PubSub<T>;
	readonly event: Event<T>;
	readonly Shutdown: () => Effect.Effect<void, never>;
}

/**
 * @description A factory function that creates a new `EventStream`.
 * @returns An `EventStream<T>` object.
 */
export const CreateEventStream = <T>(): EventStream<T> => {
	const VSCodeEmitter = new Emitter<T>();
	const PubSub = Effect.runSync(PubSub.unbounded<T>());

	const Fire = (Data: T): Effect.Effect<void, never> =>
		PubSub.publish(PubSub, Data).pipe(
			Effect.andThen(Effect.sync(() => VSCodeEmitter.fire(Data))),
			Effect.asVoid,
		);

	const Shutdown = () =>
		Effect.all([
			PubSub.shutdown(PubSub),
			Effect.sync(() => VSCodeEmitter.dispose()),
		]).pipe(Effect.asVoid);

	return {
		Fire,
		PubSub: PubSub,
		event: VSCodeEmitter.event,
		Shutdown,
	};
};
