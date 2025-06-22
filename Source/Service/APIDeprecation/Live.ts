/*
 * File: Cocoon/Source/Service/APIDeprecation/Live.ts
 *
 * This file provides the live implementation `Layer` for the APIDeprecation service.
 */

import { Layer } from "effect";

import type LogService from "../Log/Service.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the APIDeprecation service.
 * It correctly declares its dependency on the Log service.
 */
const Live: Layer.Layer<Service, never, LogService> = Layer.effect(
	Service,
	Definition,
);

export default Live;
