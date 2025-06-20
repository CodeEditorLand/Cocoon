

/**
 * @module Live (ExtensionPath)
 * @description Provides the live implementation layer for the ExtensionPath service.
 */

import { Effect, Layer } from "effect";

import InitDataService from "../../Service/InitData/Service.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation layer for the ExtensionPath service.
 * It depends on the InitData service to get the list of all installed extensions.
 */
export default Layer.effect(
	Service,
	Effect.map(
		InitDataService,
		(InitData) => new Definition(InitData.extensions.allExtensions),
	),
);
