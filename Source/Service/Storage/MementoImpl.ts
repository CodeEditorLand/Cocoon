/**
 * @module MementoImpl
 * @description The concrete implementation of the `vscode.Memento` interface.
 */

import { Effect, Stream } from "effect";
import type {
	Event,
	Memento,
	MementoChangeEvent,
	MementoKeysOption,
} from "vscode";

import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import type { IPC } from "../IPC.js";
import type { Log } from "../Log.js";

enum MementoScope {
	Profile = 0, // WorkSpace-level
	Application = 1, // Global-level
}

export class MementoImpl implements Memento {
	private readonly OnDidChangeEvent = CreateEventStream<MementoChangeEvent>();
	public readonly onDidChange: Event<MementoChangeEvent>;
	private readonly Scope: MementoScope;

	constructor(
		private readonly ExtensionId: string,
		IsGlobal: boolean,
		private readonly IPCService: IPC.Interface,
		private readonly LogService: Log.Interface,
	) {
		this.Scope = IsGlobal ? MementoScope.Application : MementoScope.Profile;
		this.onDidChange = this.OnDidChangeEvent.Stream.pipe(Stream.toEvent);
	}

	private createGetEffect = <T>(Key: string, DefaultValue?: T) =>
		this.IPCService.SendRequest<T | undefined>("$getValue", {
			scope: this.Scope,
			key: Key,
		}).pipe(
			Effect.map((result) =>
				result === undefined || result === null ? DefaultValue : result,
			),
			Effect.catchAll((err) => {
				this.LogService.Error(
					`Memento.get('${Key}') failed for ext '${this.ExtensionId}'.`,
					err,
				);
				return Effect.succeed(DefaultValue); // Fallback to default value on any error
			}),
		);

	private createUpdateEffect = (Key: string, Value: any) =>
		Effect.gen(this, function* (_) {
			const ValueForRPC = Value === undefined ? null : Value;
			yield* _(
				this.IPCService.SendNotification("$setValue", {
					scope: this.Scope,
					key: Key,
					value: ValueForRPC,
				}),
			);
			yield* _(this.OnDidChangeEvent.Fire({ keys: [Key] }));
		}).pipe(
			Effect.catchAll((err) =>
				this.LogService.Error(
					`Memento.update('${Key}') failed for ext '${this.ExtensionId}'.`,
					err,
				),
			),
		);

	private createKeysEffect = (Option?: MementoKeysOption) =>
		this.IPCService.SendRequest<readonly string[]>("$keys", {
			scope: this.Scope,
			options: Option,
		}).pipe(
			Effect.map((result) => Object.freeze(result ?? [])),
			Effect.catchAll((err) => {
				this.LogService.Error(
					`Memento.keys() failed for ext '${this.ExtensionId}'.`,
					err,
				);
				return Effect.succeed(Object.freeze([]));
			}),
		);

	get = <T>(key: string, defaultValue?: T): T | undefined => {
		// VS Code's Memento API is synchronous, so we must run this effect synchronously.
		// This is a known trade-off for API compatibility.
		return Effect.runSync(this.createGetEffect(key, defaultValue));
	};

	update = (key: string, value: any): Promise<void> =>
		Effect.runPromise(this.createUpdateEffect(key, value));
	keys = (options?: MementoKeysOption): readonly string[] =>
		Effect.runSync(this.createKeysEffect(options));
	get whenReady(): Promise<void> {
		return Promise.resolve();
	}
}
