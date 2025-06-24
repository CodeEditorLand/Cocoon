/*
 * File: Cocoon/Source/Service/Task/RPCHandlers/ProvideTasks.ts
 * Role: Implements the RPC handler for providing tasks from an extension's TaskProvider.
 * Responsibilities:
 *   - Handles the `$provideTasks` RPC call from the host.
 *   - Looks up the correct `TaskProvider` based on its handle.
 *   - Invokes the provider's `provideTasks` method with a cancellation token.
 *   - Converts the returned `Task` objects into serializable DTOs.
 */

import { Effect, Ref } from "effect";
import type { Task, TaskProvider } from "vscode";
import { Task as TaskConverter } from "../../../TypeConverter/Task.js";
import { Cancellation } from "../../Cancellation/Service.js";
import type { ProviderEntry } from "../Type.js";

/**
 * An `Effect` that handles the `$provideTasks` RPC call from the host.
 * @param Registry - A `Ref` containing all registered task providers.
 * @param Handle - The handle of the specific provider to invoke.
 * @param TokenID - The ID of the cancellation token for this operation.
 * @param CancellationService - The service to obtain the cancellation token from.
 * @returns An `Effect` that resolves to an array of Task DTOs or fails.
 */
export const ProvideTasksEffect = (
	Registry: Ref.Ref<Map<number, ProviderEntry<Task>>>,
	Handle: number,
	TokenID: number,
	CancellationService: Cancellation["Type"],
) => {
	return Effect.gen(function* (Generator) {
		const Entry = (yield* Generator(Ref.get(Registry))).get(Handle);

		if (!Entry) {
			return yield* Generator(
				Effect.fail(
					new Error(`Task provider with handle ${Handle} not found.`),
				),
			);
		}

		const Provider = Entry.Provider as TaskProvider;
		if (!Provider.provideTasks) {
			return [];
		}

		const CancellationToken = yield* Generator(
			CancellationService.ObtainToken(TokenID),
		);
		const Tasks = yield* Generator(
			Effect.tryPromise({
				try: () =>
					Provider.provideTasks(CancellationToken) as Promise<
						Task[] | null | undefined
					>,
				catch: (CaughtError) => CaughtError as Error,
			}),
		);

		if (!Tasks) {
			return [];
		}

		return Tasks.map((TheTask: Task) =>
			TaskConverter.FromAPI(TheTask, Entry.Extension),
		);
	}).pipe(
		Effect.scoped, // Ensures the CancellationToken's scope is properly managed
		Effect.catchAll(() => Effect.succeed([])), // Gracefully return empty array on any error
	);
};
