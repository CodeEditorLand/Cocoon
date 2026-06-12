/**
 * @module Services/Window/Dialog
 * @description
 * Dialog operations for showing information, warning, and error messages.
 * Delegates to Mountain's `Window.ShowMessage` gRPC request (the same
 * protocol used by `Services/Window/Text/Document.ts`); Mountain relays
 * to Sky's notification surface and resolves with the selected action
 * title or null when dismissed.
 * Following Wind Effect-TS atomic module pattern.
 *
 * TODO(EFX-30): Convert Effect.gen wrappers → async/await when Window/Index.ts callers migrate.
 */

import { Context, Effect, Layer } from "effect";

import { IMountainClientService } from "../../Interfaces/I/Mountain/Client/Service.js";
import { DialogError } from "./Errors.js";

/**
 * Dialog service interface
 */
export interface DialogService {
	readonly ShowInformationMessage: (
		message: string,

		items?: readonly string[],
	) => Effect.Effect<string | undefined, DialogError>;

	readonly ShowWarningMessage: (
		message: string,

		items?: readonly string[],
	) => Effect.Effect<string | undefined, DialogError>;

	readonly ShowErrorMessage: (
		message: string,

		items?: readonly string[],
	) => Effect.Effect<string | undefined, DialogError>;
}

/**
 * Tag for DialogService context
 */
export const DialogService = Context.Tag<DialogService>(
	"Service/Window/Dialog",
);

/**
 * Create dialog service layer
 */
export const DialogLive = Effect.gen(function* () {
	const MountainClient = yield* IMountainClientService;

	const ShowMessage = (
		operation: string,

		level: "info" | "warning" | "error",

		message: string,

		items: readonly string[],
	): Effect.Effect<string | undefined, DialogError> =>
		Effect.gen(function* () {
			const Response = yield* Effect.tryPromise({
				try: () =>
					(
						MountainClient as unknown as {
							sendRequest: (
								method: string,

								params: unknown,
							) => Promise<unknown>;
						}
					).sendRequest("Window.ShowMessage", [
						{
							message,
							level,
							items: items.map((Item) => ({ title: Item })),
							options: {},
						},
					]),
				catch: (cause) => new DialogError(operation, cause),
			});

			// Mountain returns the selected action title string or null.
			const Selected =
				typeof Response === "string"
					? Response
					: ((Response as { title?: string } | null)?.title ?? null);

			return Selected
				? (items.find((Item) => Item === Selected) ?? Selected)
				: undefined;
		});

	const ShowInformationMessage = (
		message: string,

		items: readonly string[] = [],
	): Effect.Effect<string | undefined, DialogError> =>
		ShowMessage("showInformationMessage", "info", message, items);

	const ShowWarningMessage = (
		message: string,

		items: readonly string[] = [],
	): Effect.Effect<string | undefined, DialogError> =>
		ShowMessage("showWarningMessage", "warning", message, items);

	const ShowErrorMessage = (
		message: string,

		items: readonly string[] = [],
	): Effect.Effect<string | undefined, DialogError> =>
		ShowMessage("showErrorMessage", "error", message, items);

	return DialogService.of({
		ShowInformationMessage,
		ShowWarningMessage,
		ShowErrorMessage,
	});
});

/**
 * Layer for dialog service
 */
export const DialogLayer = Layer.effect(DialogService, DialogLive);
