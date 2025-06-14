/**
 * @module Activate
 * @description Defines the primary `Effect` workflow for activating an
 * extension's main logic, typically the entry point for the user's code.
 */

import { Effect } from "effect";

import GetConfiguration from "../../Service/Configuration/GetConfiguration.js";
import ShowInformationMessage from "../../Service/Window/ShowInformationMessage.js";

/**
 * An `Effect` that orchestrates the startup logic for an extension.
 *
 * This workflow represents the main entry point of an extension's runtime
 * logic. It depends on the centralized `Configuration` and `Window` services
 * to perform its actions.
 *
 * @returns An `Effect` that resolves when the activation sequence is complete.
 *   It can fail if any of the underlying service calls fail.
 */
export default Effect.gen(function* () {
	// Retrieve the configuration for the 'cocoon' section.
	const Configuration = yield* GetConfiguration("cocoon");

	// Check the specific configuration flag, with a default value.
	const ShouldShowWelcomeMessage = Configuration.get<boolean>(
		"showWelcomeMessage",
		true,
	);

	// Log that the activation process is running.
	yield* Effect.logInfo("Cocoon extension is now active.");

	// Conditionally execute the ShowInformationMessage effect.
	// `Effect.when` is a declarative way to handle conditional side effects.
	yield* Effect.when(
		ShowInformationMessage("Welcome to Cocoon!"),
		() => ShouldShowWelcomeMessage,
	);
});
