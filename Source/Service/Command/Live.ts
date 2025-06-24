/*
 * File: Cocoon/Source/Service/Command/Live.ts
 * Role: Provides the "live" implementation Layer for the Command service.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `Command` service
 *     and provides it with its necessary dependencies.
 */

import { Layer } from "effect";
import { Definition } from "./Definition.js";
import { Command } from "./Service.js";
import { IPC } from "../IPC/Service.js";
import { Logger } from "../Log/Service.js";
import { ExtensionHost } from "../../Service/ExtensionHost/Service.js";

/**
 * The live implementation `Layer` for the `Command` service.
 * It depends on `IPC`, `Logger`, and now `ExtensionHost` to correctly
 * instantiate the original `ExtHostCommands` class.
 */
const Live: Layer.Layer<Command, never, IPC | Logger | ExtensionHost> =
	Layer.effect(Command, Definition);

export default Live;
