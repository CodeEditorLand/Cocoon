/**
 * @module SecretStorageImplementation
 * @description The concrete implementation of the `vscode.SecretStorage` interface.
 * It proxies all operations to the host process via IPC to ensure secure storage
 * in the OS keychain.
 */

import { Context, Effect } from "effect";
import type { Event, SecretStorage, SecretStorageChangeEvent } from "vscode";

import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import type LogService from "../Log/Service.js";
import { EmptyKeyError, InvalidValueError } from "./Error.js";

export default class implements SecretStorage {
	private readonly OnDidChangeEvent =
		CreateEventStream<SecretStorageChangeEvent>();
	public readonly onDidChange: Event<SecretStorageChangeEvent>;

	constructor(
		private readonly ExtensionID: string,
		private readonly IPC: IPCService["Type"],
		private readonly Log: LogService["Type"],
	) {
		this.onDidChange = this.OnDidChangeEvent.event;
		// A real implementation would need to listen to an IPC event from the host
		// to fire this OnDidChangeEvent when secrets change in other windows.
	}

	private CreateGetEffect(
		Key: string,
	): Effect.Effect<string | undefined, EmptyKeyError> {
		return Effect.gen(this, function* () {
			if (!Key) {
				return yield* new EmptyKeyError();
			}
			return yield* this.IPC.SendRequest<string | undefined>(
				"$getPassword",
				[this.ExtensionID, Key],
			);
		}).pipe(
			Effect.catchTag("IPCError", (Error) =>
				this.Log.Error(
					`SecretStorage.get failed for key '${Key}' in ext '${this.ExtensionID}'.`,
					Error,
				).pipe(Effect.flatMap(() => Effect.succeed(undefined))),
			),
		);
	}

	private CreateStoreEffect(
		Key: string,
		Value: string,
	): Effect.Effect<void, EmptyKeyError | InvalidValueError> {
		return Effect.gen(this, function* () {
			if (!Key) {
				return yield* new EmptyKeyError();
			}
			if (typeof Value !== "string") {
				return yield* new InvalidValueError();
			}
			yield* this.IPC.SendNotification("$setPassword", [
				this.ExtensionID,
				Key,
				Value,
			]);
			// Manually fire the event for local changes.
			yield* this.OnDidChangeEvent.Fire({ key: Key });
		}).pipe(
			Effect.catchAll((Error) =>
				this.Log.Error(
					`SecretStorage.store failed for key '${Key}' in ext '${this.ExtensionID}'.`,
					Error,
				).pipe(Effect.flatMap(() => Effect.void)),
			),
		);
	}

	private CreateDeleteEffect(
		Key: string,
	): Effect.Effect<void, EmptyKeyError> {
		return Effect.gen(this, function* () {
			if (!Key) {
				return yield* new EmptyKeyError();
			}
			yield* this.IPC.SendNotification("$deletePassword", [
				this.ExtensionID,
				Key,
			]);
			// Manually fire the event for local changes.
			yield* this.OnDidChangeEvent.Fire({ key: Key });
		}).pipe(
			Effect.catchAll((Error) =>
				this.Log.Error(
					`SecretStorage.delete failed for key '${Key}' in ext '${this.ExtensionID}'.`,
					Error,
				).pipe(Effect.flatMap(() => Effect.void)),
			),
		);
	}

	get = (Key: string): Promise<string | undefined> =>
		Effect.runPromise(
			Effect.provide(
				this.CreateGetEffect(Key),
				Context.make(IPCService, this.IPC),
			),
		);

	store = (Key: string, Value: string): Promise<void> =>
		Effect.runPromise(
			Effect.provide(
				this.CreateStoreEffect(Key, Value),
				Context.make(IPCService, this.IPC),
			),
		);

	delete = (Key: string): Promise<void> =>
		Effect.runPromise(
			Effect.provide(
				this.CreateDeleteEffect(Key),
				Context.make(IPCService, this.IPC),
			),
		);
}
