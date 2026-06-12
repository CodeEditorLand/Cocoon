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

import { IMountainClientService } from "../../Interfaces/I/Mountain/Client/Service.js";

import { DialogError } from "./Errors.js";

/**
 * Dialog service interface
 */
export interface DialogService {

	readonly ShowInformationMessage: (
		message: string,

		items?: readonly string[],
	) => Promise<string | undefined>;

	readonly ShowWarningMessage: (
		message: string,

		items?: readonly string[],
	) => Promise<string | undefined>;

	readonly ShowErrorMessage: (
		message: string,

		items?: readonly string[],
	) => Promise<string | undefined>;
}

/**
 * Tag for DialogService context
 */
export const DialogService = Symbol<DialogService>(
	"Service/Window/Dialog",
;

/**
 * Create dialog service layer
 */
export const DialogLive = async function() {
	const MountainClient = await IMountainClientService;

	const ShowMessage = (
		operation: string,

		level: "info" | "warning" | "error",

		message: string,

		items: readonly string[],
	): Promise<string | undefined> =>
		async function() {
			let Response;

try {
	Response = await (
						MountainClient as unknown as {
							sendRequest: (
								method: string,

								params: unknown,
							) => Promise<unknown>;;
} catch (_e) {
	// error handled below
}.sendRequest("Window.ShowMessage", [
						{
							message,

							level,

							items: items.map((Item) => ({ title: Item })),

							options: {},
						},
					]),

				catch: (cause) => new DialogError(operation, cause),
			};

			// Mountain returns the selected action title string or null.
			const Selected =
				typeof Response === "string"
					? Response
					: ((Response as { title?: string } | null)?.title ?? null;

			return Selected
				? (items.find((Item) => Item === Selected) ?? Selected)
				: undefined;
		};

	const ShowInformationMessage = (
		message: string,

		items: readonly string[] = [],
	): Promise<string | undefined> =>
		ShowMessage("showInformationMessage", "info", message, items;

	const ShowWarningMessage = (
		message: string,

		items: readonly string[] = [],
	): Promise<string | undefined> =>
		ShowMessage("showWarningMessage", "warning", message, items;

	const ShowErrorMessage = (
		message: string,

		items: readonly string[] = [],
	): Promise<string | undefined> =>
		ShowMessage("showErrorMessage", "error", message, items;

	return DialogService.of({
		ShowInformationMessage,
		ShowWarningMessage,
		ShowErrorMessage,
	};
};

/**
 * Layer for dialog service
 */
export const DialogLayer = DialogLive;
