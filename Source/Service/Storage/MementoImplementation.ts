/*
 * File: Cocoon/Source/Service/Storage/MementoImplementation.ts
 * Responsibility:
 * Modified: 2025-06-16 14:42:05 UTC
 * Dependency: ../../Utility/CreateEventStream.js, ../IPC/Service.js, ../Log/Service.js, effect, vscode
 * Export: implements
 */

/**
 * @module MementoImplementation
 * @description The concrete implementation of the `vscode.Memento` interface.
 * It provides a key-value storage that is proxied to the host process to be
 * persisted on disk.
 */

import { Effect, Ref } from "effect";
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
		const UpdateEffect = Effect.gen(this, function* () {
			yield* this.IPC.SendNotification("$setValue", [
				this.Scope,
				this.ExtensionID, // The host needs to know which extension's storage to update.
				Key,
				Value,
			]).pipe(
				Effect.tap(() =>
					Ref.update(this.ValueRef, (Current) => ({
						...(Current || {}),
						[Key]: Value,
					})),
				),
				Effect.tap(() =>
					this.OnDidChangeEventStream.Fire({ keys: [Key] }),
				),
				Effect.catchAll((Error) =>
					this.Log.Error(
						`Memento.update('${Key}') failed for ext '${this.ExtensionID}'.`,
						Error,
					),
				),
				Effect.asVoid,
			);
		});

		return Effect.runPromise(
			UpdateEffect.pipe(Effect.provide(UpdateEffect)),
		);
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

		this.OnDidChangeEventStream.Fire({ keys: Array.from(ChangedKeys) });
	}
}
