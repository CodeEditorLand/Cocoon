/*
 * File: Cocoon/Source/Service/ProposedAPI/Service.ts
 * Role: Defines the interface and Effect.Service for the ProposedAPI service.
 * Responsibilities:
 *   - Declare the contract for the service that manages and checks the enablement
 *     status of proposed (experimental) VS Code APIs for extensions.
 *   - Provide the `Effect.Service` for dependency injection.
 */

import { Effect } from "effect";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions.js";

/**
 * The `Effect.Service` for the ProposedAPI service.
 *
 * This service is responsible for determining whether a specific extension is
 * permitted to use a given proposed API, based on the application's product
 * configuration.
 */
export class ProposedAPI extends Effect.Service<ProposedAPI>(
	"Service/ProposedAPI",
)<{
	/**
	 * Checks if a specific proposed API is enabled for a given extension.
	 * @param ExtensionID - The identifier of the extension making the request.
	 * @param ProposalName - The name of the proposed API feature (e.g., 'languageModels').
	 * @returns `true` if the API is enabled for the extension, `false` otherwise.
	 */
	readonly IsEnabled: (
		ExtensionID: ExtensionIdentifier,
		ProposalName: string,
	) => boolean;
}>() {}
