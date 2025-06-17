/*
 * File: Cocoon/Source/Service/FileSystem/Live.ts
 * Responsibility: Implements the live FileSystem service layer for the Cocoon sidecar using Effect's Layer, enabling Node.js-based file system operations required for VS Code extension hosting in the Land editor's MVP Path A.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (FileSystem)
 * @description This module provides the `Live` implementation Layer for the FileSystem service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the FileSystem service.
 * It depends on the IPC and FileSystemInformation services.
 */
export default Layer.effect(Service, Definition);
