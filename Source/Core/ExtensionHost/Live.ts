/*
 * File: Cocoon/Source/Core/ExtensionHost/Live.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:55 UTC
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
export default Layer.effect(Service, Definition);
