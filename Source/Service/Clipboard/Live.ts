/*
 * File: Cocoon/Source/Service/Clipboard/Live.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:32 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (Clipboard)
 * @description The live implementation Layer for the Clipboard service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Clipboard service.
 * It depends on the IPC service for communication.
 */
export default Layer.effect(Service, Definition);
