/*
 * File: Cocoon/Source/Service/Debug/Live.ts
 * Role: Provides the "live" implementation Layer for the Debug service.
 * Responsibilities:
 *   - This module defines the `Layer` that constructs the live `Debug` service
 *     and provides it with its necessary dependencies.
 */

import { Layer } from "effect";
import { Definition } from "./Definition.js";
import { Debug } from "./Service.js";
import { IPC } from "../IPC/Service.js";

/**
 * The live implementation `Layer` for the `Debug` service.
 * It depends on the `IPC` service for communication with the host.
 */
const Live: Layer.Layer<Debug, never, IPC> = Layer.effect(Debug, Definition);

export default Live;
