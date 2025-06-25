/**
 * @module SecretStorage
 * @description Defines the service for securely storing and retrieving secrets,
 * such as API tokens. It provides a factory for creating `vscode.SecretStorage`
 * instances scoped to a specific extension.
 */

import { Effect } from "effect";
import type { Event, SecretStorage, SecretStorageChangeEvent } from "vscode";
import { IPCService } from "./IPC.js";
import { LoggerService } from "./Logger.js";
import { CreateEventStream } from "./Utility/CreateEventStream.js";

// Stubbed Errors
class EmptyKeyError extends Error {
	constructor() {
		super("Secret key cannot be empty.");
	}
}
class InvalidValueError extends Error {
	constructor() {
		super("Secret value must be a string.");
	}
}

class SecretStorageImplementation implements SecretStorage {
	private readonly OnDidChangeEventStream =
		CreateEventStream<SecretStorageChangeEvent>();
	public readonly onDidChange: Event<SecretStorageChangeEvent>;

	constructor(
		private readonly ExtensionId: string,
		private readonly IPC: IPCService,
		private readonly Logger: LoggerService,
	) {
		this.onDidChange = this.OnDidChangeEventStream.event;
	}

	private Get(Key: string): Effect.Effect<string | undefined, EmptyKeyError> {
		if (!Key) return Effect.fail(new EmptyKeyError());
		return Effect.gen(this, function* () {
			return yield* this.IPC.SendRequest<string | undefined>(
				"$getPassword",
				[this.ExtensionId, Key],
			);
		}).pipe(
			Effect.catchAll((Error) =>
				this.Logger.Error(
					`SecretStorage.get failed for key '${Key}' in ext '${this.ExtensionId}'.`,
					Error,
				).pipe(Effect.flatMap(() => Effect.succeed(undefined))),
			),
		);
	}

	private Store(
		Key: string,
		Value: string,
	): Effect.Effect<void, EmptyKeyError | InvalidValueError> {
		if (!Key) return Effect.fail(new EmptyKeyError());
		if (typeof Value !== "string")
			return Effect.fail(new InvalidValueError());
		return Effect.gen(this, function* () {
			yield* this.IPC.SendNotification("$setPassword", [
				this.ExtensionId,
				Key,
				Value,
			]);
			yield* this.OnDidChangeEventStream.Fire({ key: Key });
		}).pipe(
			Effect.catchAll((Error) =>
				this.Logger.Error(
					`SecretStorage.store failed for key '${Key}' in ext '${this.ExtensionId}'.`,
					Error,
				).pipe(Effect.flatMap(() => Effect.void)),
			),
		);
	}

	private Delete(Key: string): Effect.Effect<void, EmptyKeyError> {
		if (!Key) return Effect.fail(new EmptyKeyError());
		return Effect.gen(this, function* () {
			yield* this.IPC.SendNotification("$deletePassword", [
				this.ExtensionId,
				Key,
			]);
			yield* this.OnDidChangeEventStream.Fire({ key: Key });
		}).pipe(
			Effect.catchAll((Error) =>
				this.Logger.Error(
					`SecretStorage.delete failed for key '${Key}' in ext '${this.ExtensionId}'.`,
					Error,
				).pipe(Effect.flatMap(() => Effect.void)),
			),
		);
	}

	get = (Key: string): Promise<string | undefined> =>
		Effect.runPromise(this.Get(Key));
	store = (Key: string, Value: string): Promise<void> =>
		Effect.runPromise(this.Store(Key, Value));
	delete = (Key: string): Promise<void> =>
		Effect.runPromise(this.Delete(Key));
}

/**
 * @interface SecretStorageFactory
 * @description The contract for the SecretStorage factory service.
 */
export interface SecretStorageFactory {
	readonly CreateStorage: (ExtensionId: string) => SecretStorage;
}

/**
 * @class SecretStorageService
 * @description The `Effect.Service` for the SecretStorage factory.
 */
export class SecretStorageService extends Effect.Service<SecretStorageService>()(
	"Service/SecretStorage",
	{
		effect: Effect.gen(function* () {
			const IPC = yield* IPCService;
			const Logger = yield* LoggerService;
			return {
				CreateStorage: (ExtensionId: string): SecretStorage => {
					Effect.runSync(
						Logger.Debug(
							`Created SecretStorage for extension: '${ExtensionId}'`,
						),
					);
					return new SecretStorageImplementation(
						ExtensionId,
						IPC,
						Logger,
					);
				},
			};
		}),
	},
) {}
