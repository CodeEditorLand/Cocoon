/*
 * File: Cocoon/Source/Service/Task/Live.ts
 * Role: Provides the "live" implementation Layer for the Task service.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `Task` service instance
 *     and provides it with its necessary dependencies.
 */

import { Layer } from "effect";
import { Definition } from "./Definition.js";
import { Task } from "./Service.js";
import { IPC } from "../IPC/Service.js";
import { Cancellation } from "../Cancellation/Service.js";

/**
 * The live implementation `Layer` for the `Task` service.
 * It depends on the `IPC` service for communication and the `Cancellation`
 * service for handling task cancellation.
 */
const Live: Layer.Layer<Task, never, IPC | Cancellation> = Layer.effect(
	Task,
	Definition,
);

export default Live;
