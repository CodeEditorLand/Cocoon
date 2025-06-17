/*
 * File: Cocoon/Source/Service/Task/Live.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:12 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (Task)
 * @description The live implementation Layer for the Tasks service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Tasks service.
 * It depends on the IPC service for communication.
 */
export default Layer.effect(Service, Definition);
