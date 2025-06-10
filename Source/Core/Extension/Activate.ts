/**
 * @module Activate
 * @description Defines the primary `Effect` workflow for activating an
 * extension.
 */

import { Effect } from "effect";

import { GetConfiguration } from "../../Service/Configuration/GetConfiguration.js";
import { ShowInformationMessage } from "../../Service/Window/ShowInformationMessage.js";

/**
 * An `Effect` that orchestrates the startup logic for an extension.
 *
 * This workflow represents the main entry point of an extension's runtime
 * logic. It depends on the centralized `Configuration` and `Window` services
 * to perform the following steps:
 *
 * 1. Retrieves the workspace configuration for the 'cocoon' section.
 * 2. Logs an informational message indicating that the extension is active.
 * 3. Checks the `showWelcomeMessage` configuration setting.
 * 4. If the setting is true, it displays a welcome message to the user.
 *
 * @returns An `Effect` that resolves when the activation sequence is complete.
 *   It can fail if any of the underlying service calls fail.
 */
export const Activate = Effect.gen(function* (_) {
	// Retrieve the configuration for the 'cocoon' section.
	const Configuration = yield* _(GetConfiguration("cocoon"));

	// Check the specific configuration flag, with a default value.
	const ShouldShowWelcomeMessage = Configuration.get<boolean>(
		"showWelcomeMessage",
		true,
	);

	// Log that the activation process is running.
	yield* _(Effect.logInfo("Cocoon extension is now active."));

	// Conditionally execute the ShowInformationMessage effect.
	// `Effect.when` is a declarative way to handle conditional side effects.
	yield* _(
		Effect.when(
			ShowInformationMessage("Welcome to Cocoon!"),
			() => ShouldShowWelcomeMessage,
		),
	);
});
