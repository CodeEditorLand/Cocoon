/**
 * @module Localization
 * @description This module provides the Localization service, which manages the
 * loading and caching of localized string bundles (NLS) for extensions.
 */

import { Layer } from "effect";

import { Live as LiveIPC } from "./IPC.js";
import { Definition } from "./Localization/Definition.js";
import { Tag } from "./Localization/Service.js";

export { Tag, type Interface } from "./Localization/Service.js";

/**
 * The live implementation Layer for the Localization service.
 * It depends on the IPC and InitData services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIPC));
