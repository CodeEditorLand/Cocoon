/**
 * @module ESMInterceptor (Core)
 * @description The main module for the ESMInterceptor service, which installs a
 * Node.js loader hook to intercept `import 'vscode'` statements.
 */

import { Layer } from "effect";

import { Live as LiveLog } from "../../Service/Log.js";
import { Live as LiveAPIFactory } from "../APIFactory.js";
import { Live as LiveExtensionPath } from "../ExtensionPath.js";
import { Definition } from "./ESMInterceptor/Definition.js";
import { Tag } from "./ESMInterceptor/Service.js";

/**
 * The live implementation layer for the ESMInterceptor service.
 * It depends on the APIFactory, ExtensionPath, and logging services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.mergeAll(LiveAPIFactory, LiveExtensionPath, LiveLog)),
);
