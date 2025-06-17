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
import CancellationService from "../../Cancellation/Service.js";

/**
 * An Effect that handles the `$provideTasks` RPC call from Mountain.
 * @param Registry A Ref containing all registered task providers.
 * @param Handle The handle of the specific provider to invoke.
 * @param TokenID The ID of the cancellation token.
 * @returns An `Effect` that resolves to an array of Task DTOs.
 */
const ProvideTasksEffect = (
	Registry: Ref.Ref<Map<number, any>>,
	Handle: number,
	TokenID: number,
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

		const Cancellation = yield* G(CancellationService);
		// The `ObtainToken` method is now fully effectful and manages its own scope.
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
		// No longer need to provide the cancellation layer here.
		// The effect correctly declares its dependency, which is satisfied by the runtime.
		Effect.catchAll(() => Effect.succeed([])),
	);
};

export default ProvideTasksEffect;
