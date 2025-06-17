/*
 * File: Cocoon/Source/Core/ExtensionHost/Live.ts
 * Responsibility: Implements the live runtime layer for the Cocoon sidecar's ExtensionHost service using Effect, providing dependency wiring for VS Code extension hosting capabilities in the Node.js sidecar process.
 * Modified: 2025-06-17 21:19:41 UTC
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
