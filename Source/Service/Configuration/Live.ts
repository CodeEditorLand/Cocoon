/*
 * File: Cocoon/Source/Service/Configuration/Live.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:29 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (Configuration)
 * @description The live implementation Layer for the Configuration service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Configuration service.
 * It depends on the IPC and Log services.
 */
export default Layer.effect(Service, Definition);
