/*
 * File: Cocoon/Source/Service/FileSystemInformation/Live.ts
 * Role: Provides the "live" implementation Layer for the FileSystemInformation service.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `FileSystemInformation` service
 *     and provides it with its necessary dependencies.
 */

import { Layer } from "effect";
import { Definition } from "./Definition.js";
import { FileSystemInformation } from "./Service.js";
import { IPC } from "../IPC/Service.js";
import { Logger } from "../Log/Service.js";

/**
 * The live implementation `Layer` for the `FileSystemInformation` service.
 * It depends on the `IPC` and `Logger` services to function.
 */
const Live: Layer.Layer<FileSystemInformation, never, IPC | Logger> =
	Layer.effect(FileSystemInformation, Definition);

export default Live;
