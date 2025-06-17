/*
 * File: Cocoon/Source/Service/Dialog/Live.ts
 * Responsibility: Implements the live Layer for the Dialog service in the Sky frontend, configuring IPC-based communication with the Mountain backend via the Vine transport layer to handle dialog interactions.
 * Modified: 2025-06-17 10:53:25 UTC
 * Dependency: ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (Dialog)
 * @description The live implementation Layer for the Dialog service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Dialog service.
 * It depends on the IPC service for all communication.
 */
export default Layer.effect(Service, Definition);
