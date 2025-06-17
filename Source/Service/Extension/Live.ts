/*
 * File: Cocoon/Source/Service/Extension/Live.ts
 * Responsibility: The live implementation Layer for the Extension service.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: ../../Core/ExtensionHost/Service.js, ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (Extension)
 * @description The live implementation Layer for the Extension service.
 */

import { Layer } from "effect";

import type ExtensionHostService from "../../Core/ExtensionHost/Service.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Extension service.
 * It correctly declares its dependency on the core ExtensionHost service.
 */
const Live: Layer.Layer<Service, never, ExtensionHostService> = Layer.effect(
	Service,
	Definition,
);

export default Live;
