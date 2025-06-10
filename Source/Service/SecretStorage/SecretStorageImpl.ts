/**
 * @module SecretStorageImpl
 * @description The concrete implementation of the `vscode.SecretStorage` interface.
 */

import { Effect, Stream } from "effect";
import type { Event, SecretStorage, SecretStorageChangeEvent } from "vscode";

import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IpcProvider } from "../Ipc/mod.js";
import { LogProvider } from "../Log.js";
import { EmptyKeyError, InvalidValueError } from "./Error.js";

export class SecretStorageImpl implements SecretStorage {
	private readonly OnDidChangeEvent =
		CreateEventStream<SecretStorageChangeEvent>();
	public readonly onDidChange: Event<SecretStorageChangeEvent>;

	constructor(
		private readonly ExtensionId: string,
		private readonly Ipc: IpcProvider.Interface,
		private readonly Log: LogProvider.Interface,
	) {
		this.onDidChange = this.OnDidChangeEvent.Stream.pipe(Stream.toEvent);
	}

	private createGetEffect = (Key: string) =>
		Effect.gen(this, function* (_) {
			if (!Key) return yield* _(Effect.fail(new EmptyKeyError()));
			const result = yield* _(
				this.Ipc.SendRequest<string | null>("$getPassword", [
					this.ExtensionId,
					Key,
				]),
			);
			return result === null ? undefined : result;
		}).pipe(
			Effect.catchTag("EmptyKeyError", (e) => Effect.fail(e)),
			Effect.catchAll((err) =>
				this.Log.Error(
					`SecretStorage.get failed for key '${Key}' in ext '${this.ExtensionId}'.`,
					err,
				).pipe(Effect.flatMap(() => Effect.fail(err))),
			),
		);

	private createStoreEffect = (Key: string, Value: string) =>
		Effect.gen(this, function* (_) {
			if (!Key) return yield* _(Effect.fail(new EmptyKeyError()));
			if (typeof Value !== "string")
				return yield* _(Effect.fail(new InvalidValueError()));
			yield* _(
				this.Ipc.SendNotification("$setPassword", [
					this.ExtensionId,
					Key,
					Value,
				]),
			);
			yield* _(this.OnDidChangeEvent.Fire({ key: Key }));
		}).pipe(
			Effect.catchAll((err) =>
				this.Log.Error(
					`SecretStorage.store failed for key '${Key}' in ext '${this.ExtensionId}'.`,
					err,
				).pipe(Effect.flatMap(() => Effect.fail(err))),
			),
		);

	private createDeleteEffect = (Key: string) =>
		Effect.gen(this, function* (_) {
			if (!Key) return yield* _(Effect.fail(new EmptyKeyError()));
			yield* _(
				this.Ipc.SendNotification("$deletePassword", [
					this.ExtensionId,
					Key,
				]),
			);
			yield* _(this.OnDidChangeEvent.Fire({ key: Key }));
		}).pipe(
			Effect.catchAll((err) =>
				this.Log.Error(
					`SecretStorage.delete failed for key '${Key}' in ext '${this.ExtensionId}'.`,
					err,
				).pipe(Effect.flatMap(() => Effect.fail(err))),
			),
		);

	get = (key: string): Promise<string | undefined> =>
		Effect.runPromise(this.createGetEffect(key));
	store = (key: string, value: string): Promise<void> =>
		Effect.runPromise(this.createStoreEffect(key, value));
	delete = (key: string): Promise<void> =>
		Effect.runPromise(this.createDeleteEffect(key));
}
