/**
 * @module CreateEventStream
 * @description Hybrid event emitter bridging VS Code Event API - plain Set, no Effect-TS PubSub.
 */

import {
	Emitter,
	type Event,
} from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/event.js";

export interface EventStream<T> {
	readonly Fire: (Data: T) => void;

	readonly event: Event<T>;

	readonly Shutdown: () => void;
}

export const CreateEventStream = <T>(): EventStream<T> => {
	const VSCodeEmitter = new Emitter<T>(;

	const Fire = (Data: T): void => VSCodeEmitter.fire(Data;

	const Shutdown = (): void => VSCodeEmitter.dispose(;

	return {
		Fire,

		event: VSCodeEmitter.event,

		Shutdown,
	};
};
