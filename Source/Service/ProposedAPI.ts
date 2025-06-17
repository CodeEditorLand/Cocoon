/*
 * File: Cocoon/Source/Service/ProposedAPI.ts
 * Responsibility:
 * Modified: 2025-06-15 19:16:54 UTC
 * Dependency: ./Log.js, ./ProposedAPI/Definition.js, ./ProposedAPI/Service.js, effect
 * Export: Live, default
 */

/**
 * @module ProposedAPI
 * @description This module provides the ProposedAPI service, which checks the
 * enablement status of experimental VS Code APIs for extensions.
 */

import { Layer } from "effect";

import { Live as LogLive } from "./Log.js";
import Definition from "./ProposedAPI/Definition.js";
import Service from "./ProposedAPI/Service.js";

export { default as Service } from "./ProposedAPI/Service.js";

/**
 * The live implementation Layer for the ProposedAPI service.
 * It depends on the Log and InitData services.
 */
export default Layer.effect(Service, Definition).pipe(Layer.provide(LogLive));
