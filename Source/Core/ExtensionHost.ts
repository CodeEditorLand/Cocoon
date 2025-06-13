/**
 * @module ExtensionHost (Core)
 * @description The main module for the Extension Host service, which manages the
 * entire lifecycle of extensions. It provides the `Live` implementation Layer
 * for the service.
 */

import { Layer } from "effect";

import { InitData } from "../Service/InitData.js";
import { IPC } from "../Service/IPC.js";
import { Log } from "../Service/Log.js";
import { APIFactory } from "./APIFactory.js";
import { Definition } from "./ExtensionHost/Definition.js";
import { Tag } from "./ExtensionHost/Service.js";

/**
 * The live implementation layer for the ExtensionHost service.
 * It depends on the APIFactory, logging, IPC, and initialization data services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(
		Layer.mergeAll(
			APIFactory.Live,
			Log.Live,
			IPC.Live,
			// The InitData layer is special and will be provided at the top-level
			// when the application starts, so we don't provide a concrete Live
			// implementation for it here. It's an external dependency.
		),
	),
);
