/*
 * File: Cocoon/Source/Service/StatusBar/Live.ts
 * Role: Provides the "live" implementation Layer for the StatusBar service.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `StatusBar` service instance
 *     and provides it with its necessary dependencies.
 */

import { Layer } from "effect";
import { Definition } from "./Definition.js";
import { StatusBar } from "./Service.js";
import { IPC } from "../IPC/Service.js";
import { Command } from "../Command/Service.js";

/**
 * The live implementation `Layer` for the `StatusBar` service.
 * It depends on the `IPC` service for communicating UI updates to the host
 * and the `Command` service for handling command registrations.
 */
const Live: Layer.Layer<StatusBar, never, IPC | Command> = Layer.effect(
	StatusBar,
	Definition,
);

export default Live;
