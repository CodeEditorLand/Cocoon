/**
 * @module Services/Window/Dialog
 * @description
 * Dialog operations for showing information, warning, and error messages.
 * Following Wind Effect-TS atomic module pattern.
 */

import { Context, Effect, Layer } from "effect";

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
	const ShowInformationMessage = (
		message: string,
		items: readonly string[] = [],
	): Effect.Effect<string | undefined, DialogError> =>
		Effect.gen(function* () {
			// TODO: MOUNTAIN-INTEGRATION: Implement actual gRPC call
			// const result = yield* Effect.tryPromise({
			//   try: () => mountainClient.invoke('window.showInformationMessage', { message, items }),
			//   catch: (cause) => new DialogError('showInformationMessage', cause)
			// });

			// Mock implementation
			return undefined;
		});

	const ShowWarningMessage = (
		message: string,
		items: readonly string[] = [],
	): Effect.Effect<string | undefined, DialogError> =>
		Effect.gen(function* () {
			// TODO: MOUNTAIN-INTEGRATION: Implement actual gRPC call
			return undefined;
		});

	const ShowErrorMessage = (
		message: string,
		items: readonly string[] = [],
	): Effect.Effect<string | undefined, DialogError> =>
		Effect.gen(function* () {
			// TODO: MOUNTAIN-INTEGRATION: Implement actual gRPC call
			return undefined;
		});

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
