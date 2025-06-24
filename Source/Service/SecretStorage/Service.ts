/*
 * File: Cocoon/Source/Service/SecretStorage/Service.ts
 * Role: Defines the SecretStorage factory service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Provide a factory for creating `SecretStorage` instances scoped to a specific extension.
 */

import { Effect } from "effect";
import type { Event, SecretStorage, SecretStorageChangeEvent } from "vscode";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IPC as IPCService } from "../IPC/Service.js";
import { Logger } from "../Log/Service.js";
import { EmptyKeyError } from "./Error/EmptyKeyError.js";
import { InvalidValueError } from "./Error/InvalidValueError.js";

// --- Internal SecretStorage Implementation ---
class SecretStorageImplementation implements SecretStorage {
	private readonly OnDidChangeEventStream =
		CreateEventStream<SecretStorageChangeEvent>();
	public readonly onDidChange: Event<SecretStorageChangeEvent>;

	constructor(
		private readonly ExtensionID: string,
		private readonly IPC: IPCService,
		private readonly LogService: Logger,
	) {
		this.onDidChange = this.OnDidChangeEventStream.event;
	}

	private CreateGetEffect = (
		Key: string,
	): Effect.Effect<string | undefined, EmptyKeyError> =>
		Effect.gen(this, function* (Generator) {
			if (!Key) return yield* Generator(new EmptyKeyError());
			return yield* Generator(
				this.IPC.SendRequest<string | undefined>("$getPassword", [
					this.ExtensionID,
					Key,
				]),
			);
		}).pipe(
			Effect.catchTag("IPCError", (Error) =>
				this.LogService.Error(
					`SecretStorage.get failed for key '${Key}' in ext '${this.ExtensionID}'.`,
					Error,
				).pipe(Effect.flatMap(() => Effect.succeed(undefined))),
			),
		);

	private CreateStoreEffect = (
		Key: string,
		Value: string,
	): Effect.Effect<void, EmptyKeyError | InvalidValueError> =>
		Effect.gen(this, function* (Generator) {
			if (!Key) return yield* Generator(new EmptyKeyError());
			if (typeof Value !== "string")
				return yield* Generator(new InvalidValueError());
			yield* Generator(
				this.IPC.SendNotification("$setPassword", [
					this.ExtensionID,
					Key,
					Value,
				]),
			);
			yield* Generator(this.OnDidChangeEventStream.Fire({ key: Key }));
		}).pipe(
			Effect.catchAll((Error) =>
				this.LogService.Error(
					`SecretStorage.store failed for key '${Key}' in ext '${this.ExtensionID}'.`,
					Error,
				).pipe(Effect.flatMap(() => Effect.void)),
			),
		);

	private CreateDeleteEffect = (
		Key: string,
	): Effect.Effect<void, EmptyKeyError> =>
		Effect.gen(this, function* (Generator) {
			if (!Key) return yield* Generator(new EmptyKeyError());
			yield* Generator(
				this.IPC.SendNotification("$deletePassword", [
					this.ExtensionID,
					Key,
				]),
			);
			yield* Generator(this.OnDidChangeEventStream.Fire({ key: Key }));
		}).pipe(
			Effect.catchAll((Error) =>
				this.LogService.Error(
					`SecretStorage.delete failed for key '${Key}' in ext '${this.ExtensionID}'.`,
					Error,
				).pipe(Effect.flatMap(() => Effect.void)),
			),
		);

	get = (Key: string): Promise<string | undefined> =>
		Effect.runPromise(this.CreateGetEffect(Key));
	store = (Key: string, Value: string): Promise<void> =>
		Effect.runPromise(this.CreateStoreEffect(Key, Value));
	delete = (Key: string): Promise<void> =>
		Effect.runPromise(this.CreateDeleteEffect(Key));
}

// --- Service Definition ---
export class SecretStorage extends Effect.Service<SecretStorage>()(
	"Service/SecretStorage",
	{
		effect: Effect.gen(function* (Generator) {
			const IPC = yield* Generator(IPCService);
			const LogService = yield* Generator(Logger);
			return {
				CreateStorage: (ExtensionID: string): SecretStorage => {
					Effect.runSync(
						LogService.Debug(
							`Created SecretStorage for extension: '${ExtensionID}'`,
						),
					);
					return new SecretStorageImplementation(
						ExtensionID,
						IPC,
						LogService,
					);
				},
			};
		}),
	},
) {}
