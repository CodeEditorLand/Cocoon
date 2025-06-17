/*
 * File: Cocoon/Source/Service/Message/Live.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:17 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (Message)
 * @description The live implementation Layer for the Message service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Message service.
 * It depends on the IPC service for communication.
 */
export default Layer.effect(Service, Definition);
