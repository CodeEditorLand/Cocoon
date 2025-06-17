/*
 * File: Cocoon/Source/Service/Extension/Live.ts
 * Responsibility: The live implementation Layer for the Extension service.
 * Modified: 2025-06-17 10:52:54 UTC
 */

/**
 * @module Live (Extension)
 * @description The live implementation Layer for the Extension service.
 */

import { Layer } from "effect";

import type ExtensionHostService from "../../Core/ExtensionHost/Service.js";
import type InitDataService from "../InitData/Service.js"; // Import InitDataService
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Extension service.
 * It correctly declares its dependency on the core ExtensionHost and InitData services.
 */
// FIX: Add `InitDataService` to the list of required dependencies for this layer.
const Live: Layer.Layer<
	Service,
	never,
	ExtensionHostService | InitDataService
> = Layer.effect(Service, Definition);

export default Live;
