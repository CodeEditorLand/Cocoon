/**
 * @module LanguageFeature
 * @description This module provides the `vscode.languages` API implementation,
 * managing the registration and invocation of all language feature providers.
 */

import { Layer } from "effect";

import { Live as LiveCancellation } from "./Cancellation.js";
import { Live as LiveCommand } from "./Command.js";
import { Live as LiveDocument } from "./Document.js";
import { Live as LiveIPC } from "./IPC.js";
import { Definition } from "./LanguageFeature/Definition.js";
import { Tag } from "./LanguageFeature/Service.js";

export { Tag, type Interface } from "./LanguageFeature/Service.js";

/**
 * The live implementation Layer for the LanguageFeature service.
 * It has many core dependencies for handling RPC calls, including IPC for
 * transport, Document for accessing document state, Cancellation for handling
 * cancellation signals, and Command for converting command objects.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(
		Layer.mergeAll(LiveIPC, LiveDocument, LiveCancellation, LiveCommand),
	),
);
