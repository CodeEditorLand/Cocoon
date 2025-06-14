/**
 * @module Live (HostKindPicker)
 * @description This module provides the `Live` implementation Layer for the HostKindPicker service.
 */

import { Layer } from "effect";

import LogLive from "../../Service/Log/Live.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the HostKindPicker service.
 * It depends on the Log service for reporting its decisions.
 */
export default Layer.effect(Service, Definition).pipe(Layer.provide(LogLive));
