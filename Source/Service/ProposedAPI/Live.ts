/*
 * File: Cocoon/Source/Service/ProposedAPI/Live.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:16:55 UTC
 * Dependency: ../Log.js, ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (ProposedAPI)
 * @description The live implementation Layer for the ProposedAPI service.
 */

import { Layer } from "effect";

import { Live as LogLive } from "../Log.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the ProposedAPI service.
 * It depends on the Log and InitData services.
 */
const Live = Layer.effect(Service, Definition).pipe(Layer.provide(LogLive));

export default Live;
