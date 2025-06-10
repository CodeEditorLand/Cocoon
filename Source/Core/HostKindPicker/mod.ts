/**
 * @module HostKindPicker (Core)
 * @description This module provides the HostKindPicker service, which determines if
 * an extension is compatible with the Cocoon (Node.js) extension host.
 */

import { Layer } from "effect";

import { Live as LiveLog } from "../../Service/Log.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";

/**
 * The live implementation Layer for the HostKindPicker service.
 * It depends on the Log service for reporting its decisions.
 */
export const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveLog));
