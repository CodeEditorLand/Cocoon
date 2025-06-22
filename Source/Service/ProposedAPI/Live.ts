/*
 * File: Cocoon/Source/Service/ProposedAPI/Live.ts
 *
 * This file provides the live implementation Layer for the ProposedAPI service.
 */

import { Layer } from "effect";

import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the ProposedAPI service.
 * It depends on the Log and InitData services.
 */
export default Layer.effect(Service, Definition);
