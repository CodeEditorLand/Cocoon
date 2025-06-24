/*
 * File: Cocoon/Source/Service/Message/Live.ts
 * Role: Provides the "live" implementation Layer for the Message service.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `Message` service instance
 *     and provides it with its necessary dependencies.
 */

import { Layer } from "effect";
import { Definition } from "./Definition.js";
import { Message } from "./Service.js";
import { IPC } from "../IPC/Service.js";

/**
 * The live implementation `Layer` for the `Message` service.
 * It depends on the `IPC` service for communication with the host.
 */
const Live: Layer.Layer<Message, never, IPC> = Layer.effect(
	Message,
	Definition,
);

export default Live;
