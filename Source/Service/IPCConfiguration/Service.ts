/**
 * @module Service (IPCConfiguration)
 * @description Defines the Context.Tag for the IPCConfiguration service.
 */

import { Context } from "effect";

import type Definition from "./Definition.js";

/**
 * The `Context.Tag` for the IPCConfiguration service.
 */
class IPCConfigurationService extends Context.Tag("Service/IPCConfiguration")<
	IPCConfigurationService,
	Definition
>() {}

export default IPCConfigurationService;
