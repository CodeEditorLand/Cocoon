/**
 * @module ExtensionHost (Core)
 * @description The main module for the Extension Host service, which manages the
 * entire lifecycle of extensions.
 */

import { Layer } from "effect";

import { InitDataService } from "../../Service/InitData.js";
import { Live as LiveIpc } from "../../Service/Ipc/mod.js";
import { Live as LiveLog } from "../../Service/Log.js";
import { Live as LiveApiFactory } from "../ApiFactory/mod.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

/**
 * The live implementation layer for the ExtensionHost service.
 * It depends on the ApiFactory, logging, IPC, and initialization data services.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(LiveApiFactory),
	Layer.provide(LiveLog),
	Layer.provide(LiveIpc),
	Layer.provide(Layer.succeed(InitDataService, {} as any)), // Placeholder for real init data
);
