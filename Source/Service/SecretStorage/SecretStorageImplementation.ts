/**
 * @module SecretStorageImplementation
 * @description The concrete implementation of the `vscode.SecretStorage` interface.
 * It proxies all operations to the host process via IPC to ensure secure storage
 * in the OS keychain.
 */

import { Effect, Stream } from "effect";
import type { Event, SecretStorage, SecretStorageChangeEvent } from "vscode";

import CreateEventStream from "../../Utility/CreateEventStream.js";
import type IPCService from "../IPC/Service.js";
import type LogService from "../Log/Service.js";
import EmptyKeyError from "./Error/EmptyKeyError.js";
import InvalidValueError from "./Error/InvalidValueError.js";

export default class implements SecretStorage {
	private readonly OnDidChangeEvent =
		CreateEventStream<SecretStorageChangeEvent>();
	public readonly onDidChange: Event<SecretStorageChangeEvent>;

	constructor(
		private readonly ExtensionID: string,
		private readonly IPC: IPCService,
		private readonly Log: LogService,
	) {
		this.onDidChange = Stream.toEvent(this.OnDidChangeEvent.Stream);
		// A real implementation would need to listen to an IPC event from the host
		// to fire this OnDidChangeEvent when secrets change in other windows.
	}

	private createGetEffect(Key: string) {
		return Effect.gen(this, function* (_) {
			if (!Key) {
				return yield* _(Effect.fail(new EmptyKeyError()));
			}
			const result = yield* _(
				this.IPC.SendRequest<string | undefined>("$getPassword", [
					this.ExtensionID,
					Key,
				]),
			);
			return result;
		}).pipe(
			Effect.catchTag("EmptyKeyError", (e) => Effect.fail(e)),
			Effect.catchAll((err) =>
				this.Log.Error(
					`SecretStorage.get failed for key '${Key}' in ext '${this.ExtensionID}'.`,
					err,
				).pipe(Effect.flatMap(() => Effect.fail(err))),
			),
		);
	}

	private createStoreEffect(Key: string, Value: string) {
		return Effect.gen(this, function* (_) {
			if (!Key) {
				return yield* _(Effect.fail(new EmptyKeyError()));
			}
			if (typeof Value !== "string") {
				return yield* _(Effect.fail(new InvalidValueError()));
			}
			yield* _(
				this.IPC.SendNotification("$setPassword", [
					this.ExtensionID,
					Key,
					Value,
				]),
			);
			// Manually fire the event for local changes.
			yield* _(this.OnDidChangeEvent.Fire({ key: Key }));
		}).pipe(
			Effect.catchAll((err) =>
				this.Log.Error(
					`SecretStorage.store failed for key '${Key}' in ext '${this.ExtensionID}'.`,
					err,
				).pipe(Effect.flatMap(() => Effect.fail(err))),
			),
		);
	}

	private createDeleteEffect(Key: string) {
		return Effect.gen(this, function* (_) {
			if (!Key) {
				return yield* _(Effect.fail(new EmptyKeyError()));
			}
			yield* _(
				this.IPC.SendNotification("$deletePassword", [
					this.ExtensionID,
					Key,
				]),
			);
			// Manually fire the event for local changes.
			yield* _(this.OnDidChangeEvent.Fire({ key: Key }));
		}).pipe(
			Effect.catchAll((err) =>
				this.Log.Error(
					`SecretStorage.delete failed for key '${Key}' in ext '${this.ExtensionID}'.`,
					err,
				).pipe(Effect.flatMap(() => Effect.fail(err))),
			),
		);
	}

	get = (key: string): Promise<string | undefined> =>
		Effect.runPromise(this.createGetEffect(key));

	store = (key: string, value: string): Promise<void> =>
		Effect.runPromise(this.createStoreEffect(key, value));

	delete = (key: string): Promise<void> =>
		Effect.runPromise(this.createDeleteEffect(key));
}
