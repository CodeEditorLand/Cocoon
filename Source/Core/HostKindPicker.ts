/**
 * @module HostKindPicker (Core)
 * @description This module provides the HostKindPicker service, which determines if
 * an extension is compatible with the Cocoon (Node.js) extension host. It provides
 * the `Live` implementation Layer for the service.
 */

import { Layer } from "effect";

import { Live as LiveLog } from "../../Service/Log.js";
import { Definition } from "./HostKindPicker/Definition.js";
import { Tag } from "./HostKindPicker/Service.js";

export { Tag, type Interface } from "./HostKindPicker/Service.js";

/**
 * The live implementation Layer for the HostKindPicker service.
 * It depends on the Log service for reporting its decisions.
 */
export const Live = Layer.effect(Tag, Definition).pipe(Layer.provide(LiveLog));
