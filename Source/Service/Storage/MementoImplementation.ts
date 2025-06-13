/**
 * @module MementoImplementation
 * @description The concrete implementation of the `vscode.Memento` interface.
 * It provides a key-value storage that is proxied to the host process to be
 * persisted on disk.
 */

import { Effect, Ref, Stream } from "effect";
import type {
	Event,
	Memento,
	MementoChangeEvent,
	MementoKeysOptions,
} from "vscode";

import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import type { IPC } from "../IPC.js";
import type { Log } from "../Log.js";

enum MementoScope {
	GLOBAL = 0,
	WORKSPACE = 1,
}

export class MementoImplementation implements Memento {
	private readonly OnDidChangeEvent = CreateEventStream<MementoChangeEvent>();
	public readonly onDidChange: Event<MementoChangeEvent>;
	private readonly Scope: MementoScope;
	private readonly _value: Ref.Ref<object | undefined>;

	constructor(
		private readonly ExtensionID: string,
		IsGlobal: boolean,
		private readonly IPCService: IPC.Interface,
		private readonly LogService: Log.Interface,
		InitialValue: object | undefined,
	) {
		this.Scope = IsGlobal ? MementoScope.GLOBAL : MementoScope.WORKSPACE;
		this.onDidChange = this.OnDidChangeEvent.Stream.pipe(Stream.toEvent);
		this._value = Ref.unsafeMake(InitialValue);
	}

	get<T>(key: string): T | undefined;
	get<T>(key: string, defaultValue: T): T;
	get<T>(key: string, defaultValue?: T): T | undefined {
		const state = Ref.get(this._value).pipe(Effect.runSync);
		let value = (state as any)?.[key];
		if (typeof value === "undefined") {
			value = defaultValue;
		}
		return value;
	}

	update(key: string, value: any): Promise<void> {
		const updateEffect = this.IPCService.SendNotification("$setValue", [
			this.Scope,
			key,
			value,
		]).pipe(
			Effect.tap(() =>
				Ref.update(this._value, (current) => ({
					...current,
					[key]: value,
				})),
			),
			Effect.tap(() => this.OnDidChangeEvent.Fire({ keys: [key] })),
			Effect.catchAll((err) =>
				this.LogService.Error(
					`Memento.update('${key}') failed for ext '${this.ExtensionID}'.`,
					err,
				),
			),
		);
		return Effect.runPromise(updateEffect);
	}

	keys(options?: MementoKeysOptions): readonly string[] {
		const state = Ref.get(this._value).pipe(Effect.runSync);
		return Object.keys(state || {});
	}

	get whenReady(): Promise<void> {
		// The Memento is ready as soon as it's created in this implementation.
		return Promise.resolve();
	}

	/**
	 * Internal method to accept state updates from the host.
	 */
	public acceptValue(value: object | undefined) {
		const oldValue = Ref.get(this._value).pipe(Effect.runSync);
		Ref.set(this._value, value).pipe(Effect.runSync);

		const oldKeys = Object.keys(oldValue || {});
		const newKeys = Object.keys(value || {});
		const changedKeys = new Set([...oldKeys, ...newKeys]);

		this.OnDidChangeEvent.Fire({ keys: Array.from(changedKeys) });
	}
}
