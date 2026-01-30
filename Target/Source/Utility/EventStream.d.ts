/**
 * @module CreateEventStream
 * @description A utility for creating a hybrid event emitter that bridges Effect-TS
 * PubSub with the VS Code Event API.
 */
import { type Event } from "@codeeditorland/output/vs/base/common/event.js";
import { Effect, PubSub } from "effect";
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
export declare const CreateEventStream: <T>() => EventStream<T>;
//# sourceMappingURL=EventStream.d.ts.map