/*
 * File: Cocoon/Source/Service/Document/Live.ts
 * Role: Provides the "live" implementation Layer for the Document service.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `Document` service instance
 *     and provides it with its necessary dependencies.
 */

import { Layer } from "effect";
import { Definition } from "./Definition.js";
import { Document } from "./Service.js";
import { IPC } from "../IPC/Service.js";

/**
 * The live implementation `Layer` for the `Document` service.
 * It depends on the `IPC` service to receive document state updates from the host.
 */
const Live: Layer.Layer<Document, never, IPC> = Layer.effect(
	Document,
	Definition,
);

export default Live;
