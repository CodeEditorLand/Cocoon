/*
 * File: Cocoon/Source/Service/Dialog/Live.ts
 * Role: Provides the "live" implementation Layer for the Dialog service.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `Dialog` service instance
 *     and provides it with its necessary dependencies.
 */

import { Layer } from "effect";
import { Definition } from "./Definition.js";
import { Dialog } from "./Service.js";
import { IPC } from "../IPC/Service.js";

/**
 * The live implementation `Layer` for the `Dialog` service.
 * It depends on the `IPC` service for all communication with the native host.
 */
const Live: Layer.Layer<Dialog, never, IPC> = Layer.effect(Dialog, Definition);

export default Live;
