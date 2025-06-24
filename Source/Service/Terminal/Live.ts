/*
 * File: Cocoon/Source/Service/Terminal/Live.ts
 * Role: Provides the "live" implementation Layer for the Terminal service.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `Terminal` service instance
 *     and provides it with its necessary dependencies.
 */

import { Layer } from "effect";
import { Definition } from "./Definition.js";
import { Terminal } from "./Service.js";
import { Command } from "../Command/Service.js";
import { IPC } from "../IPC/Service.js";

/**
 * The live implementation `Layer` for the `Terminal` service.
 * It depends on the `Command` and `IPC` services to correctly instantiate
 * the original `ExtHostTerminalService`.
 */
const Live: Layer.Layer<Terminal, never, Command | IPC> = Layer.effect(
	Terminal,
	Definition,
);

export default Live;
