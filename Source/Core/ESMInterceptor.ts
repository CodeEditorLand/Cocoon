/**
 * @module EsmInterceptor (Core)
 * @description The main module for the EsmInterceptor service, which installs a
 * Node.js loader hook to intercept `import 'vscode'` statements.
 */

import { Layer } from "effect";

import { Live as LiveLog } from "../../Service/Log.js";
import { Live as LiveAPIFactory } from "../APIFactory.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

/**
 * The live implementation layer for the EsmInterceptor service.
 * It depends on the APIFactory and logging services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(Layer.merge(LiveAPIFactory, LiveLog)),
);
