// Cocoon/Source/Service/Storage/MementoImplementation.ts

/**
 * @module MementoImplementation
 * @description The concrete implementation of the `vscode.Memento` interface.
 * It provides a key-value storage that is proxied to the host process to be
 * persisted on disk.
 */

import { Effect, Layer, Ref } from "effect";
// FIX: These types are part of the `vscode` namespace directly, not module exports.
// We define them here or ensure our types are compatible.
import type {
	Event,
	Memento,
	MementoChangeEvent as VscodeMementoChangeEvent,
	MementoKeysOptions as VscodeMementoKeysOptions,
} from "vscode";

import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";

// Make our types compatible aliases
type MementoChangeEvent = VscodeMementoChangeEvent;
type MementoKeysOptions = VscodeMementoKeysOptions;

enum MementoScope {
	GLOBAL = 0,
	WORKSPACE = 1,
}

export default class implements Memento {
	private readonly OnDidChangeEvent = CreateEventStream<MementoChangeEvent>();
	public readonly onDidChange: Event<MementoChangeEvent>;
	private readonly Scope: MementoScope;
	private readonly ValueRef: Ref.Ref<object | undefined>;

	// FIX: Inject dependencies into the constructor.
	constructor(
		private readonly ExtensionID: string,
		IsGlobal: boolean,
		InitialValue: object | undefined,
		private readonly IPC: IPCService["Type"],
		private readonly Log: LogService["Type"],
	) {
		this.Scope = IsGlobal ? MementoScope.GLOBAL : MementoScope.WORKSPACE;
		this.onDidChange = this.OnDidChangeEvent.event;
		this.ValueRef = Ref.unsafeMake(InitialValue);
	}

	get<T>(Key: string): T | undefined;
	get<T>(Key: string, DefaultValue: T): T;
	get<T>(Key: string, DefaultValue?: T): T | undefined {
		const State = Effect.runSync(Ref.get(this.ValueRef));
		let Value = (State as any)?.[Key];
		if (typeof Value === "undefined") {
			Value = DefaultValue;
		}
		return Value;
	}

	update(Key: string, Value: any): Promise<void> {
		const UpdateEffect = Effect.gen(this, function* (that) {
			// Now that IPC and Log are class properties, we can use them.
			yield* that.IPC.SendNotification("$setValue", [
				that.Scope,
				Key,
				Value,
			]).pipe(
				Effect.tap(() =>
					Ref.update(that.ValueRef, (Current) => ({
						...Current,
						[Key]: Value,
					})),
				),
				Effect.tap(() => that.OnDidChangeEvent.Fire({ keys: [Key] })),
				Effect.catchAll((Error) =>
					that.Log.Error(
						`Memento.update('${Key}') failed for ext '${that.ExtensionID}'.`,
						Error,
					),
				),
				Effect.asVoid,
			);
		});

		// FIX: We no longer need to provide the services here because they are
		// part of the class instance now. `this` handles it.
		return Effect.runPromise(UpdateEffect.pipe(Effect.provide(this)));
	}

	keys(_Options?: MementoKeysOptions): readonly string[] {
		const State = Effect.runSync(Ref.get(this.ValueRef));
		return Object.keys(State || {});
	}

	get whenReady(): Promise<void> {
		// The Memento is ready as soon as it's created in this implementation.
		return Promise.resolve();
	}

	/**
	 * Internal method to accept state updates from the host.
	 */
	public acceptValue(Value: object | undefined) {
		const OldValue = Effect.runSync(Ref.get(this.ValueRef));
		Effect.runSync(Ref.set(this.ValueRef, Value));

		const OldKeys = Object.keys(OldValue || {});
		const NewKeys = Object.keys(Value || {});
		const ChangedKeys = new Set([...OldKeys, ...NewKeys]);

		this.OnDidChangeEvent.Fire({ keys: Array.from(ChangedKeys) });
	}
}
