/*
 * File: Cocoon/Source/Service/QuickInput/Live.ts
 * Role: Provides the "live" implementation Layer for the QuickInput service.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `QuickInput` service instance
 *     and provides it with its necessary dependencies.
 */

import { Layer } from "effect";
import { Definition } from "./Definition.js";
import { QuickInput } from "./Service.js";
import { IPC } from "../IPC/Service.js";

/**
 * The live implementation `Layer` for the `QuickInput` service.
 * It depends on the `IPC` service for communication with the native host.
 */
const Live: Layer.Layer<QuickInput, never, IPC> = Layer.effect(
	QuickInput,
	Definition,
);

export default Live;
