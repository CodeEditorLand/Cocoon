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
	MementoChangeEvent,
	MementoKeysOptions,
} from "vscode";

import CreateEventStream from "../../Utility/CreateEventStream.js";
import type IPCService from "../IPC/Service.js";
import type LogService from "../Log/Service.js";

enum MementoScope {
	GLOBAL = 0,
	WORKSPACE = 1,
}

export default class implements Memento {
	private readonly OnDidChangeEvent = CreateEventStream<MementoChangeEvent>();
	public readonly onDidChange: Event<MementoChangeEvent>;
	private readonly Scope: MementoScope;
	private readonly ValueRef: Ref.Ref<object | undefined>;

	constructor(
		private readonly ExtensionID: string,
		IsGlobal: boolean,
		private readonly IPC: IPCService,
		private readonly Log: LogService,
		InitialValue: object | undefined,
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
		const UpdateEffect = this.IPC.SendNotification("$setValue", [
			this.Scope,
			Key,
			Value,
		]).pipe(
			Effect.tap(() =>
				Ref.update(this.ValueRef, (Current) => ({
					...Current,
					[Key]: Value,
				})),
			),
			Effect.tap(() => this.OnDidChangeEvent.Fire({ keys: [Key] })),
			Effect.catchAll((Error) =>
				this.Log.Error(
					`Memento.update('${Key}') failed for ext '${this.ExtensionID}'.`,
					Error,
				),
			),
			Effect.asVoid,
		);
		return Effect.runPromise(UpdateEffect);
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
