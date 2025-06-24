/*
 * File: Cocoon/Source/Service/Environment/Live.ts
 * Role: Provides the "live" implementation Layer for the Environment service.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `Environment` service instance
 *     and provides it with its necessary dependencies.
 */

import { Layer } from "effect";
import { Definition } from "./Definition.js";
import { Environment } from "./Service.js";
import { IPC } from "../IPC/Service.js";
import { InitData } from "../InitData/Service.js";
import { Clipboard } from "../Clipboard/Service.js";

/**
 * The live implementation `Layer` for the `Environment` service.
 * It depends on the `IPC`, `InitData`, and `Clipboard` services.
 */
const Live: Layer.Layer<Environment, never, IPC | InitData | Clipboard> =
	Layer.effect(Environment, Definition);

export default Live;
