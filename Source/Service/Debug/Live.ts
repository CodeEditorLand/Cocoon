/*
 * File: Cocoon/Source/Service/Debug/Live.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:30 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (Debug)
 * @description This module provides the `Live` implementation Layer for the Debug service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Debug service.
 * It depends on the IPC and Log services.
 */
export default Layer.effect(Service, Definition);
