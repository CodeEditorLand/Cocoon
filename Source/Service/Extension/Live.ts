/*
 * File: Cocoon/Source/Service/Extension/Live.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:26 UTC
 * Dependency: ../../Core/ExtensionHost/Service.js, ../InitData/Service.js, ./Definition.js, ./Service.js, effect
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
