/*
 * File: Cocoon/Source/Service/FileSystemInformation/Live.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:24 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (FileSystemInformation)
 * @description The live implementation Layer for the FileSystemInformation service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the FileSystemInformation service.
 * It depends on the IPC and Log services.
 */
export default Layer.effect(Service, Definition);
