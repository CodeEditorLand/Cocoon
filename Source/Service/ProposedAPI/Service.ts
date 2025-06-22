/*
 * File: Cocoon/Source/Service/ProposedAPI/Service.ts
 *
 * This file defines the interface and Context.Tag for the ProposedAPI service.
 * This service manages and checks the enablement status of proposed
 * (experimental) VS Code APIs for extensions.
 */

import { Context } from "effect";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions.js";

/**
 * The Context.Tag for the ProposedAPI service.
 */
export default class ProposedAPIService extends Context.Tag(
	"Service/ProposedAPI",
)<
	ProposedAPIService,
	{
		/**
		 * Checks if a specific proposed API is enabled for a given extension.
		 * @param ExtensionID The identifier of the extension making the request.
		 * @param ProposalName The name of the proposed API feature (e.g., 'languageModels').
		 * @returns `true` if the API is enabled, `false` otherwise.
		 */
		readonly IsEnabled: (
			ExtensionID: ExtensionIdentifier,
			ProposalName: string,
		) => boolean;
	}
>() {}
