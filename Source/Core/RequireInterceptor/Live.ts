/*
 * File: Cocoon/Source/Core/RequireInterceptor/Live.ts
 * Role: Provides the "live" implementation Layer for the RequireInterceptor service.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `RequireInterceptor` service
 *     and provides it with its necessary dependencies.
 */

import { Layer } from "effect";
import { Definition } from "./Definition.js";
import { RequireInterceptor } from "./Service.js";
import { Logger } from "../../Service/Log/Service.js";
import { APIFactory } from "../APIFactory/Service.js";
import { ExtensionPath } from "../ExtensionPath/Service.js";
import { NodeModuleShim } from "../NodeModuleShim/Service.js";

/**
 * The live implementation `Layer` for the `RequireInterceptor` service.
 * It correctly declares its dependencies on `APIFactory`, `ExtensionPath`,
 * `NodeModuleShim`, and `Logger` services.
 */
const Live: Layer.Layer<
	RequireInterceptor,
	never,
	APIFactory | ExtensionPath | NodeModuleShim | Logger
> = Layer.effect(RequireInterceptor, Definition);

export default Live;
