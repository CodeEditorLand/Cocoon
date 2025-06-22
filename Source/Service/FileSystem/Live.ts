/*
 * File: Cocoon/Source/Service/FileSystem/Live.ts
 *
 * This file provides the `Live` implementation Layer for the FileSystem service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the FileSystem service.
 * It depends on the IPC and FileSystemInformation services.
 */
export default Layer.effect(Service, Definition);
