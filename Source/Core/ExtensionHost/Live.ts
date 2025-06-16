/*
 * File: Cocoon/Source/Core/ExtensionHost/Live.ts
 * Responsibility:
 * Modified: 2025-06-15 19:17:25 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (ExtensionHost)
 * @description The live implementation Layer for the Extension Host service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the ExtensionHost service.
 * It depends on several other services like Log, IPC, APIFactory, and InitData,
 * which must be provided to this layer.
 */
const Live = Layer.effect(Service, Definition);

export default Live;
