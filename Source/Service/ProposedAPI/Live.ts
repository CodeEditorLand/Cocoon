/*
 * File: Cocoon/Source/Service/ProposedAPI/Live.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:16 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (ProposedAPI)
 * @description The live implementation Layer for the ProposedAPI service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the ProposedAPI service.
 * It depends on the Log and InitData services.
 */
export default Layer.effect(Service, Definition);
