/*
 * File: Cocoon/Source/Service/WorkSpace/Live.ts
 * Role: Provides the "live" implementation Layer for the Workspace service.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `Workspace` service instance
 *     and provides it with its necessary dependencies.
 */

import { Layer } from "effect";
import { Definition } from "./Definition.js";
import { Workspace } from "./Service.js";
import { IPC } from "../IPC/Service.js";
import { Document } from "../Document/Service.js";
import { FileSystem } from "../FileSystem/Service.js";
import { Configuration } from "../Configuration/Service.js";

/**
 * The live implementation `Layer` for the `Workspace` service.
 * It depends on `IPC`, `Document`, `FileSystem`, and `Configuration` services.
 */
const Live: Layer.Layer<
	Workspace,
	never,
	IPC | Document | FileSystem | Configuration
> = Layer.effect(Workspace, Definition);

export default Live;
