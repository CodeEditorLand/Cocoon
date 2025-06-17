/*
 * File: Cocoon/Source/Service/Localization.ts
 * Responsibility:
 * Modified: 2025-06-16 14:46:23 UTC
 * Dependency: ./IPC.js, ./IPC/Configuration.js, ./Localization/Definition.js, ./Localization/Service.js, effect
 * Export: Live, default
 */

/**
 * @module Localization
 * @description This module provides the Localization service, which manages the
 * loading and caching of localized string bundles (NLS) for extensions.
 */

import { Layer } from "effect";

import { Live as IPCLive } from "./IPC.js";
import { type IPCConfiguration } from "./IPC/Configuration.js";
import Definition from "./Localization/Definition.js";
import Service from "./Localization/Service.js";

export { default as Service } from "./Localization/Service.js";

/**
 * The live implementation Layer for the Localization service.
 * It depends on the IPC and InitData services.
 */
export default (Configuration: IPCConfiguration) =>
	Layer.effect(Service, Definition).pipe(
		Layer.provide(IPCLive(Configuration)),
	);
