/**
 * @module SecretStorageImplementation
 * @description The concrete implementation of the `vscode.SecretStorage` interface.
 * It proxies all operations to the host process via IPC to ensure secure storage
 * in the OS keychain.
 */

import { Effect } from "effect";
import type { Event, SecretStorage, SecretStorageChangeEvent } from "vscode";

import CreateEventStream from "../../Utility/CreateEventStream.js";
import type IPCService from "../IPC/Service.js";
import type LogService from "../Log/Service.js";
import EmptyKeyError from "./Error/EmptyKeyError.js";
import InvalidValueError from "./Error/InvalidValueError.js";

export default class SecretStorageImplementation implements SecretStorage {
	private readonly OnDidChangeEventStream =
		CreateEventStream<SecretStorageChangeEvent>();
	public readonly onDidChange: Event<SecretStorageChangeEvent>;

	constructor(
		private readonly ExtensionID: string,
		private readonly IPC: IPCService["Type"],
		private readonly Log: LogService["Type"],
	) {
		this.onDidChange = this.OnDidChangeEventStream.event;
		// A real implementation would need to listen to an IPC event from the host
		// to fire this OnDidChangeEvent when secrets change in other windows.
	}

	private CreateGetEffect(
		Key: string,
	): Effect.Effect<string | undefined, EmptyKeyError> {
		return Effect.gen(this, function* (G) {
			if (!Key) {
				return yield* G(new EmptyKeyError());
			}
			return yield* G(
				this.IPC.SendRequest<string | undefined>("$getPassword", [
					this.ExtensionID,
					Key,
				]),
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
		return Effect.gen(this, function* (G) {
			if (!Key) {
				return yield* G(new EmptyKeyError());
			}
			if (typeof Value !== "string") {
				return yield* G(new InvalidValueError());
			}
			yield* G(
				this.IPC.SendNotification("$setPassword", [
					this.ExtensionID,
					Key,
					Value,
				]),
			);
			yield* G(this.OnDidChangeEventStream.Fire({ key: Key }));
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
		return Effect.gen(this, function* (G) {
			if (!Key) {
				return yield* G(new EmptyKeyError());
			}
			yield* G(
				this.IPC.SendNotification("$deletePassword", [
					this.ExtensionID,
					Key,
				]),
			);
			yield* G(this.OnDidChangeEventStream.Fire({ key: Key }));
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
		Effect.runPromise(this.CreateGetEffect(Key));

	store = (Key: string, Value: string): Promise<void> =>
		Effect.runPromise(this.CreateStoreEffect(Key, Value));

	delete = (Key: string): Promise<void> =>
		Effect.runPromise(this.CreateDeleteEffect(Key));
}
