/*
 * File: Cocoon/Source/Service/Extension/Live.ts
 * Responsibility:
 * Modified: 2025-06-15 19:17:07 UTC
 * Dependency: ../../Core/ExtensionHost.js, ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (Extension)
 * @description The live implementation Layer for the Extension service.
 */

import { Layer } from "effect";

import { Live as ExtensionHostLive } from "../../Core/ExtensionHost.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Extension service.
 * It depends on the core ExtensionHost service to get information about
 * and activate other extensions.
 */
const Live = Layer.effect(Service, Definition).pipe(
	Layer.provide(ExtensionHostLive),
);
export default Live;
