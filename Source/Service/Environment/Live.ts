/*
 * File: Cocoon/Source/Service/Environment/Live.ts
 * Responsibility: Implements the live Environment service layer for Mountain's backend, providing native OS environment capabilities through Tauri's IPC and clipboard integration.
 * Modified: 2025-06-17 10:32:37 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (Environment)
 * @description The live implementation Layer for the Environment service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Environment service.
 * It depends on IPC and Clipboard services.
 */
export default Layer.effect(Service, Definition);
