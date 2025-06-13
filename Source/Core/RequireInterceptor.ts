/**
 * @module RequireInterceptor (Core)
 * @description The main module for the RequireInterceptor service, which patches
 * Node.js's `require` to provide sandboxed APIs to extensions.
 */

import { Layer } from "effect";

import { Live as LiveLog } from "../../Service/Log.js";
import { Live as LiveApiFactory } from "../ApiFactory.js";
import { Live as LiveExtensionPaths } from "../ExtensionPath.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

/**
 * The live implementation layer for the RequireInterceptor service.
 * It has dependencies that need to be provided to it.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.mergeAll(LiveApiFactory, LiveExtensionPaths, LiveLog)),
);
