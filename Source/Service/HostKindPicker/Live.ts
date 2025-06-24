/*
 * File: Cocoon/Source/Service/HostKindPicker/Live.ts
 * Role: Provides the "live" implementation Layer for the HostKindPicker service.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `HostKindPicker` service
 *     and provides it with its necessary dependencies.
 */

import { Layer } from "effect";
import { Definition } from "./Definition.js";
import { HostKindPicker } from "./Service.js";
import { Logger } from "../Log/Service.js";

/**
 * The live implementation `Layer` for the `HostKindPicker` service.
 * It correctly declares its dependency on the `Logger` service.
 */
const Live: Layer.Layer<HostKindPicker, never, Logger> = Layer.effect(
	HostKindPicker,
	Definition,
);

export default Live;
