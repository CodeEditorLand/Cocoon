/*
 * File: Cocoon/Source/Service/QuickInput/Live.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:37:54 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (QuickInput)
 * @description The live implementation Layer for the QuickInput service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the QuickInput service.
 * It depends on the IPC service for communication.
 */
export default Layer.effect(Service, Definition);
