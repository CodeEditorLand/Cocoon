/*
 * File: Cocoon/Source/Service/Command/Live.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:31 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Command
 * @description This module provides the `vscode.commands` API implementation,
 * managing command registration and execution.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Command service.
 * It depends on the IPC, Telemetry, and WorkSpace services.
 */
export default Layer.effect(Service, Definition);
