/*
 * File: Cocoon/Source/Service/FileSystem/Live.ts
 * Role: Provides the "live" implementation Layer for the FileSystem service.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `FileSystem` service instance
 *     and provides it with its necessary dependencies.
 */

import { Layer } from "effect";
import { Definition } from "./Definition.js";
import { FileSystem } from "./Service.js";
import { IPC } from "../IPC/Service.js";
import { FileSystemInformation } from "../FileSystemInformation/Service.js";

/**
 * The live implementation `Layer` for the `FileSystem` service.
 * It depends on the `IPC` and `FileSystemInformation` services.
 */
const Live: Layer.Layer<FileSystem, never, IPC | FileSystemInformation> =
	Layer.effect(FileSystem, Definition);

export default Live;
