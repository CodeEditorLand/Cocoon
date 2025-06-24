/*
 * File: Cocoon/Source/Service/Window/Live.ts
 * Role: Provides the "live" implementation Layer for the Window service.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `Window` service instance
 *     and provides it with its necessary dependencies.
 */

import { Layer } from "effect";
import { Definition } from "./Definition.js";
import { Window } from "./Service.js";
import { IPC } from "../IPC/Service.js";

/**
 * The live implementation `Layer` for the `Window` service.
 * It depends on the `IPC` service for communication with the host to manage
 * window state and show editors.
 */
const Live: Layer.Layer<Window, never, IPC> = Layer.effect(Window, Definition);

export default Live;
