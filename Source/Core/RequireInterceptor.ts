/**
 * @module RequireInterceptor (Core)
 * @description The main module for the RequireInterceptor service, which patches
 * Node.js's `require` to provide sandboxed APIs to extensions.
 */

import { Layer } from "effect";

import { Live as LiveLog } from "../../Service/Log.js";
import { Live as LiveAPIFactory } from "../APIFactory.js";
import { Live as LiveExtensionPath } from "../ExtensionPath.js";
import { Definition } from "./RequireInterceptor/Definition.js";
import { Tag } from "./RequireInterceptor/Service.js";

/**
 * The live implementation layer for the RequireInterceptor service.
 * It has dependencies on the APIFactory, ExtensionPath, and Log services,
 * which are provided to it here.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.mergeAll(LiveAPIFactory, LiveExtensionPath, LiveLog)),
);
