/*
 * File: Cocoon/Source/Service/APIDeprecation/Live.ts
 * Role: Provides the "live" implementation Layer for the APIDeprecation service.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `APIDeprecation` service
 *     and provides it with its necessary dependencies.
 */

import { Layer } from "effect";
import { Definition } from "./Definition.js";
import { APIDeprecation } from "./Service.js";
import { Logger } from "../Log/Service.js";

/**
 * The live implementation `Layer` for the `APIDeprecation` service.
 * It correctly declares its dependency on the `Logger` service.
 */
const Live: Layer.Layer<APIDeprecation, never, Logger> = Layer.effect(
	APIDeprecation,
	Definition,
);

export default Live;
