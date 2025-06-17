/*
 * File: Cocoon/Source/Service/StatusBar/Live.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (StatusBar)
 * @description The live implementation Layer for the StatusBar service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the StatusBar service.
 * It depends on the IPC service for communication.
 */
export default Layer.effect(Service, Definition);
