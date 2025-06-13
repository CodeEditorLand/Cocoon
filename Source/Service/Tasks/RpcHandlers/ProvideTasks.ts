/**
 * @module ProvideTasks (RPCHandlers)
 * @description Implements the RPC handler for providing tasks from an extension.
 */

import { Effect } from "effect";
import type { TaskProvider } from "vscode";

import * as TypeConverter from "../../../TypeConverter.js";

/**
 * An Effect that handles the `$provideTasks` RPC call from Mountain.
 * @param Registry - The Ref containing all registered task providers.
 * @param Handle - The handle of the specific provider to invoke.
 * @returns An Effect that resolves to an array of Task DTOs.
 */
export const ProvideTasks = (Registry: any, Handle: number) =>
	Effect.gen(function* (_) {
		const Entry = (yield* _(Registry)).get(Handle);
		if (!Entry)
			throw new Error(`Task provider with handle ${Handle} not found.`);

		const Provider = Entry.provider as TaskProvider;
		if (!Provider.provideTasks) return [];

		// Cancellation would be handled here by obtaining a token.
		const Tasks = yield* _(
			Effect.tryPromise(() => Provider.provideTasks!({} as any)),
		);

		if (!Tasks) return [];

		return Tasks.map((task) =>
			TypeConverter.Task.fromAPI(task, Entry.extension),
		);
	}).pipe(Effect.catchAll(() => Effect.succeed([])));
