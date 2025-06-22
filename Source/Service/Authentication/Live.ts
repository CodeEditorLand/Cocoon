/*
 * File: Cocoon/Source/Service/Authentication/Live.ts
 *
 * This file provides the live implementation Layer for the Authentication service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Authentication service.
 * It depends on the IPC and Log services for communication.
 */
export default Layer.effect(Service, Definition);
