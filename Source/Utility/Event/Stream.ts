/**
 * @module CreateEventStream
 * @description Hybrid event emitter bridging VS Code Event API - plain Set, no Effect-TS PubSub.
 */

import {
	Emitter,
	type Event,
} from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/event.js";
import { Effect } from "effect";

export interface EventStream<T> {
	readonly Fire: (Data: T) => Effect.Effect<void, never>;

	readonly event: Event<T>;

	readonly Shutdown: () => Effect.Effect<void, never>;
}

export const CreateEventStream = <T>(): EventStream<T> => {
	const VSCodeEmitter = new Emitter<T>();

	const Fire = (Data: T): Effect.Effect<void, never> =>
		Effect.sync(() => VSCodeEmitter.fire(Data));

	const Shutdown = (): Effect.Effect<void, never> =>
		Effect.sync(() => VSCodeEmitter.dispose());

	return {
		Fire,
		event: VSCodeEmitter.event,
		Shutdown,
	};
};
