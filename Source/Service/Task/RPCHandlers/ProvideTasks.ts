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
const ProvideTasks = (
	Registry: Ref.Ref<Map<number, any>>,
	Handle: number,
	TokenID: number,
) => {
	return Effect.gen(function* () {
		const Entry = (yield* Ref.get(Registry)).get(Handle);
		if (!Entry) {
			return yield* Effect.fail(
				new Error(`Task provider with handle ${Handle} not found.`),
			);
		}

		const Provider = Entry.Provider as TaskProvider;
		if (!Provider.provideTasks) {
			return [];
		}

		const Cancellation = yield* CancellationService;
		const { Token } = yield* Cancellation.ObtainToken(TokenID);

		const Tasks = yield* Effect.tryPromise({
			try: () => Provider.provideTasks!(Token),
			catch: (CaughtError) => CaughtError as Error,
		});

		if (!Tasks) {
			return [];
		}

		return Tasks.map((Task: Task) =>
			TaskConverter.FromAPI(Task, Entry.Extension),
		);
	}).pipe(
		Effect.scoped, // Ensures cancellation token scope is handled
		Effect.catchAll(() => Effect.succeed([])), // On error, return an empty array
	);
};

export default ProvideTasks;
