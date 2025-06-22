/*
 * File: Cocoon/Source/Service/Clipboard/Live.ts
 *
 * This file provides the live implementation Layer for the Clipboard service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Clipboard service.
 * It depends on the IPC service for communication.
 */
export default Layer.effect(Service, Definition);
