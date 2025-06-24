/*
 * File: Cocoon/Source/Core/ExtensionHost/Live.ts
 * Role: Provides the "live" implementation Layer for the ExtensionHost service.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `ExtensionHost` service instance
 *     and provides it with its necessary dependencies.
 */

import { Layer } from "effect";
import { Definition } from "./Definition.js";
import { ExtensionHost } from "./Service.js";
import { Logger } from "../../Service/Log/Service.js";
import { IPC } from "../../Service/IPC/Service.js";
import { InitData } from "../../Service/InitData/Service.js";
import { Telemetry } from "../../Service/Telemetry/Service.js";

/**
 * The live implementation `Layer` for the `ExtensionHost` service.
 * It depends on several other core services like `Logger`, `IPC`, `InitData`,
 * and `Telemetry`, which must be provided to this layer.
 */
const Live: Layer.Layer<
	ExtensionHost,
	never,
	Logger | IPC | InitData | Telemetry
> = Layer.effect(ExtensionHost, Definition);

export default Live;
