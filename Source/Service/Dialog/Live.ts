/*
 * File: Cocoon/Source/Service/Dialog/Live.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:26 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (Dialog)
 * @description The live implementation Layer for the Dialog service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Dialog service.
 * It depends on the IPC service for all communication.
 */
export default Layer.effect(Service, Definition);
