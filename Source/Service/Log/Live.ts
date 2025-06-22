/*
 * File: Cocoon/Source/Service/Log/Live.ts
 *
 * This file provides the live implementation `Layer` for the Log service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Log service.
 * It has no external dependencies.
 */
export default Layer.effect(Service, Definition);
