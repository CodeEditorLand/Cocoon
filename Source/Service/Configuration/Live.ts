/*
 * File: Cocoon/Source/Service/Configuration/Live.ts
 * Role: Provides the "live" implementation of the Configuration service as a Layer.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `Configuration` service instance
 *     from its `Definition`.
 *   - Declares the error types that can be produced during the layer's construction.
 */

import { Layer } from "effect";
import { Definition } from "./Definition.js";
import { Configuration } from "./Service.js";
import { ApplicationConfigurationProblem } from "./Error.js";
// @ts-expect-error - Assuming these integration types exist
import type { IntegrationConfigurationProblem } from "Source/Integration/Tauri/Configuration/Error.js";
// @ts-expect-error
import type { IntegrationPathProblem } from "Source/Integration/Tauri/Path/Error.js";

/**
 * The combined error type for the live `Configuration` layer, encompassing
 * all potential failures from the application and integration layers.
 */
type LiveConfigurationProblem =
	| ApplicationConfigurationProblem
	| IntegrationPathProblem
	| IntegrationConfigurationProblem;

/**
 * The live implementation `Layer` for the `Configuration` service.
 *
 * It uses `Layer.effect` to construct the service instance from its definition,
 * which is an `Effect` that resolves the application's settings on startup.
 * The Layer's error channel includes all possible errors from the underlying
 * integration services. This layer has no dependencies itself, as it is the
 * source of configuration for other services.
 */
const Live: Layer.Layer<Configuration, LiveConfigurationProblem, never> =
	Layer.effect(Configuration, Definition);

export default Live;
