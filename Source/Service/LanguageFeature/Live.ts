/**
 * @module Live (LanguageFeature)
 * @description The live implementation Layer for the LanguageFeature service.
 */

import { Layer } from "effect";

import { CancellationLive } from "../Cancellation.js";
import { Live as CommandLive } from "../Command.js";
import { Live as DocumentLive } from "../Document.js";
import { Live as IPCLive } from "../IPC.js";
import type IPCConfiguration from "../IPC/Configuration.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the LanguageFeature service.
 * It has many core dependencies for handling RPC calls, including IPC for
 * transport, Document for accessing document state, Cancellation for handling
 * cancellation signals, and Command for converting command objects.
 * @param Config The IPC Configuration.
 */
const Live = (Config: IPCConfiguration) =>
	Layer.effect(Service, Definition).pipe(
		Layer.provide(
			Layer.mergeAll(
				IPCLive(Config),
				DocumentLive(Config),
				CancellationLive,
				CommandLive(Config),
			),
		),
	);

export default Live;
