/**
 * @module Localization
 * @description This module provides the Localization service, which manages the
 * loading and caching of localized string bundles (NLS) for extensions.
 */

import { Layer } from "effect";

import { InitDataService } from "../InitData.js";
import { Live as LiveIPC } from "../IPC.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";

/**
 * The live implementation Layer for the Localization service.
 * It depends on the IPC and InitData services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveIPC));
