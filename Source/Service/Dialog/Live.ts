/*
 * File: Cocoon/Source/Service/Dialog/Live.ts
 *
 * This file provides the live implementation Layer for the Dialog service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Dialog service.
 * It depends on the IPC service for all communication.
 */
export default Layer.effect(Service, Definition);
