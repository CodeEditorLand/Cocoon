/*
 * File: Cocoon/Source/Core/ExtensionPath/Live.ts
 * Role: Provides the "live" implementation Layer for the ExtensionPath service.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `ExtensionPath` service instance.
 */

import { Effect, Layer } from "effect";
import { Definition } from "./Definition.js";
import { ExtensionPath } from "./Service.js";
import { InitData } from "../../Service/InitData/Service.js";

/**
 * The live implementation `Layer` for the `ExtensionPath` service.
 *
 * It uses `Layer.effect` and depends on the `InitData` service to get the
 * list of all installed extensions upon initialization. It then constructs
 * the `Definition` class with this data.
 */
const Live: Layer.Layer<ExtensionPath, never, InitData> = Layer.effect(
	ExtensionPath,
	Effect.map(
		InitData,
		(InitDataService) =>
			new Definition(InitDataService.extensions.allExtensions),
	),
);

export default Live;
