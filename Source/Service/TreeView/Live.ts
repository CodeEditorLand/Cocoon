/*
 * File: Cocoon/Source/Service/TreeView/Live.ts
 * Role: Provides the "live" implementation Layer for the TreeView service.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `TreeView` service instance
 *     and provides it with its necessary dependencies.
 */

import { Layer } from "effect";
import { Definition } from "./Definition.js";
import { TreeView } from "./Service.js";
import { IPC } from "../IPC/Service.js";
import { Command } from "../Command/Service.js";

/**
 * The live implementation `Layer` for the `TreeView` service.
 * It depends on the `IPC` service for communicating with the host and the
 * `Command` service for handling command interactions within the tree.
 */
const Live: Layer.Layer<TreeView, never, IPC | Command> = Layer.effect(
	TreeView,
	Definition,
);

export default Live;
