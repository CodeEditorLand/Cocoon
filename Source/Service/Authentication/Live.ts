/*
 * File: Cocoon/Source/Service/Authentication/Live.ts
 * Role: Provides the "live" implementation Layer for the Authentication service.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `Authentication` service instance
 *     and provides it with all of its necessary dependencies.
 */

import { Layer } from "effect";
import { Definition } from "./Definition.js";
import { Authentication } from "./Service.js";
import { IPC } from "../IPC/Service.js";
import { InitData } from "../InitData/Service.js";
import { Window } from "../Window/Service.js";
import { Logger } from "../Log/Service.js";

/**
 * The live implementation `Layer` for the `Authentication` service.
 *
 * It declares its dependencies on `IPC`, `InitData`, `Window`, and `Logger`.
 * These services must be available in the context for this layer to be built successfully.
 */
const Live: Layer.Layer<
	Authentication,
	never,
	IPC | InitData | Window | Logger
> = Layer.effect(Authentication, Definition);

export default Live;
