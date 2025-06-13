/**
 * @module ExtensionHost (Core)
 * @description The main module for the Extension Host service, which manages the
 * entire lifecycle of extensions.
 */

import { Layer } from "effect";

import { InitDataService } from "../Service/InitData.js";
import { Live as LiveIPC } from "../Service/IPC.js";
import { Live as LiveLog } from "../Service/Log.js";
import { Live as LiveAPIFactory } from "./APIFactory.js";
import { Definition } from "./ExtensionHost/Definition.js";
import { Tag } from "./ExtensionHost/Service.js";

/**
 * The live implementation layer for the ExtensionHost service.
 * It depends on the APIFactory, logging, IPC, and initialization data services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(LiveAPIFactory),
	Layer.provide(LiveLog),
	Layer.provide(LiveIPC),
	Layer.provide(Layer.succeed(InitDataService, {} as any)), // Placeholder for real init data
);
