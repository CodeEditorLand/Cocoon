/*
 * File: Cocoon/Source/Core/ESMInterceptor/Live.ts
 * Role: Provides the "live" implementation Layer for the ESMInterceptor service.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `ESMInterceptor` service
 *     and provides it with its necessary dependencies.
 */

import { Layer } from "effect";
import { Definition } from "./Definition.js";
import { ESMInterceptor } from "./Service.js";
import { APIFactory } from "../APIFactory/Service.js";
import { ExtensionPath } from "../ExtensionPath/Service.js";
import { Logger } from "../../Service/Log/Service.js";

/**
 * The live implementation `Layer` for the `ESMInterceptor` service.
 * It correctly declares its dependencies on the `APIFactory`, `ExtensionPath`,
 * and `Logger` services.
 */
const Live: Layer.Layer<
	ESMInterceptor,
	never,
	APIFactory | ExtensionPath | Logger
> = Layer.effect(ESMInterceptor, Definition);

export default Live;
