/**
 * @module ProvideTasks (Task/RPCHandlers)
 * @description Implements the RPC handler for providing tasks from an extension's TaskProvider.
 */

import { Effect } from "effect";
import type { CancellationToken, TaskProvider } from "vscode";

import * as TypeConverter from "../../../TypeConverter.js";
import { Cancellation } from "../../Cancellation/Service.js";

/**
 * An Effect that handles the `$provideTasks` RPC call from Mountain.
 * @param Registry A Ref containing all registered task providers.
 * @param Handle The handle of the specific provider to invoke.
 * @param TokenID The ID for the cancellation token.
 * @returns An `Effect` that resolves to an array of Task DTOs.
 */
export function ProvideTasks(
	Registry: Effect.Ref<Map<number, any>>,
	Handle: number,
	TokenID: number,
) {
	return Effect.gen(function* (_) {
		const Entry = (yield* _(Registry)).get(Handle);
		if (!Entry) {
			return yield* _(
				Effect.fail(
					new Error(`Task provider with handle ${Handle} not found.`),
				),
			);
		}

		const Provider = Entry.provider as TaskProvider;
		if (!Provider.provideTasks) {
			return [];
		}

		const CancellationService = yield* _(Cancellation.Tag);
		const { Token } = yield* _(CancellationService.ObtainToken(TokenID));

		const Tasks = yield* _(
			Effect.tryPromise(() => Provider.provideTasks!(Token)),
		);

		if (!Tasks) {
			return [];
		}

		return Tasks.map((task) =>
			TypeConverter.Task.FromAPI(task, Entry.extension),
		);
	}).pipe(
		Effect.scoped, // Ensures cancellation token scope is handled
		Effect.catchAll(() => Effect.succeed([])), // On error, return an empty array
	);
}
