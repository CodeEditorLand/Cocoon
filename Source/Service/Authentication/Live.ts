/*
 * File: Cocoon/Source/Service/Authentication/Live.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:33 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (Authentication)
 * @description The live implementation Layer for the Authentication service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Authentication service.
 * It depends on the IPC and Log services for communication.
 */
export default Layer.effect(Service, Definition);
