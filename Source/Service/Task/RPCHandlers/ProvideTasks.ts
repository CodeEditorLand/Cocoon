/*
 * File: Cocoon/Source/Service/Task/RPCHandlers/ProvideTasks.ts
 * Responsibility: Implements the RPC handler for providing tasks from an extension's TaskProvider.
 * Modified: 2025-06-17 10:53:23 UTC
 */

/**
 * @module ProvideTasks (Task/RPCHandlers)
 * @description Implements the RPC handler for providing tasks from an extension's TaskProvider.
 */

import { Effect, Ref } from "effect";
import type { Task, TaskProvider } from "vscode";

import { Task as TaskConverter } from "../../../TypeConverter/Task.js";
import type CancellationService from "../../Cancellation/Service.js"; // Import the type

/**
 * An Effect that handles the `$provideTasks` RPC call from Mountain.
 * @param Registry A Ref containing all registered task providers.
 * @param Handle The handle of the specific provider to invoke.
 * @param TokenID The ID of the cancellation token.
 * @param Cancellation The CancellationService instance.
 * @returns An `Effect` that resolves to an array of Task DTOs.
 */
const ProvideTasksEffect = (
	Registry: Ref.Ref<Map<number, any>>,
	Handle: number,
	TokenID: number,
	// FIX: Explicitly take the CancellationService as an argument.
	Cancellation: CancellationService["Type"],
) => {
	return Effect.gen(function* (G) {
		const Entry = (yield* G(Ref.get(Registry))).get(Handle);
		if (!Entry) {
			return yield* G(
				Effect.fail(
					new Error(`Task provider with handle ${Handle} not found.`),
				),
			);
		}

		const Provider = Entry.Provider as TaskProvider;
		if (!Provider.provideTasks) {
			return [];
		}

		const Token = yield* G(Cancellation.ObtainToken(TokenID));

		const Tasks = yield* G(
			Effect.tryPromise({
				try: () =>
					Provider.provideTasks!(Token) as Promise<
						Task[] | null | undefined
					>,
				catch: (CaughtError) => CaughtError,
			}),
		);

		if (!Tasks) {
			return [];
		}

		return Tasks.map((Task: Task) =>
			TaskConverter.FromAPI(Task, Entry.Extension),
		);
	}).pipe(
		Effect.scoped,
		Effect.catchAll(() => Effect.succeed([])),
	);
};

export default ProvideTasksEffect;
