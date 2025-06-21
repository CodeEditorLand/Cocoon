/**
 * @module MementoImplementation
 * @description The concrete implementation of the `vscode.Memento` interface.
 * It provides a key-value storage that is proxied to the host process to be
 * persisted on disk.
 */

import { Effect, Ref } from "effect";
import type { Event, Memento } from "vscode";

import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";

// These types are part of the vscode API but might not be exported at the top level.
interface MementoChangeEvent {
	readonly keys: readonly string[];
}
interface MementoKeysOptions {
	readonly prefix?: string;
}

enum MementoScope {
	GLOBAL = 0,
	WORKSPACE = 1,
}

export default class MementoImplementation implements Memento {
	private readonly OnDidChangeEventStream =
		CreateEventStream<MementoChangeEvent>();
	public readonly onDidChange: Event<MementoChangeEvent>;
	public readonly Scope: MementoScope;
	private readonly ValueRef: Ref.Ref<object | undefined>;

	constructor(
		private readonly ExtensionID: string,
		IsGlobal: boolean,
		InitialValue: object | undefined,
		private readonly IPC: IPCService["Type"],
		private readonly Log: LogService["Type"],
	) {
		this.Scope = IsGlobal ? MementoScope.GLOBAL : MementoScope.WORKSPACE;
		this.onDidChange = this.OnDidChangeEventStream.event;
		this.ValueRef = Ref.unsafeMake(InitialValue);
	}

	private CreateUpdateEffect(
		Key: string,
		Value: any,
	): Effect.Effect<void, never> {
		return Effect.gen(this, function* (G) {
			yield* G(
				this.IPC.SendNotification("$setValue", [
					this.Scope,
					this.ExtensionID,
					Key,
					Value,
				]),
			);
			yield* G(
				Ref.update(this.ValueRef, (Current) => ({
					...(Current || {}),
					[Key]: Value,
				})),
			);
			yield* G(this.OnDidChangeEventStream.Fire({ keys: [Key] }));
		}).pipe(
			Effect.catchAll((Error) =>
				this.Log.Error(
					`Memento.update('${Key}') failed for ext '${this.ExtensionID}'.`,
					Error,
				),
			),
			Effect.asVoid,
		);
	}

	get<T>(Key: string): T | undefined;
	get<T>(Key: string, DefaultValue: T): T;
	get<T>(Key: string, DefaultValue?: T): T | undefined {
		const State = Effect.runSync(Ref.get(this.ValueRef));
		const Value = (State as any)?.[Key];
		return Value !== undefined ? Value : DefaultValue;
	}

	update(Key: string, Value: any): Promise<void> {
		return Effect.runPromise(this.CreateUpdateEffect(Key, Value));
	}

	keys(_Options?: MementoKeysOptions): readonly string[] {
		const State = Effect.runSync(Ref.get(this.ValueRef));
		return Object.keys(State || {});
	}

	get whenReady(): Promise<void> {
		return Promise.resolve();
	}

	public acceptValue(Value: object | undefined) {
		const OldValue = Effect.runSync(Ref.get(this.ValueRef));
		Effect.runSync(Ref.set(this.ValueRef, Value));

		const OldKeys = Object.keys(OldValue || {});
		const NewKeys = Object.keys(Value || {});
		const ChangedKeys = [...new Set([...OldKeys, ...NewKeys])];

		this.OnDidChangeEventStream.Fire({ keys: ChangedKeys });
	}
}
