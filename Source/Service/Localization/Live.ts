/*
 * File: Cocoon/Source/Service/Localization/Live.ts
 * Role: Provides the "live" implementation Layer for the Localization service.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `Localization` service instance
 *     and provides it with its necessary dependencies.
 */

import { Layer } from "effect";
import { Definition } from "./Definition.js";
import { Localization } from "./Service.js";
import { IPC } from "../IPC/Service.js";
import { InitData } from "../InitData/Service.js";

/**
 * The live implementation `Layer` for the `Localization` service.
 * It depends on the `IPC` and `InitData` services.
 */
const Live: Layer.Layer<Localization, never, IPC | InitData> = Layer.effect(
	Localization,
	Definition,
);

export default Live;
