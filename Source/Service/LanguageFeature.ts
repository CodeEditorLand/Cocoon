/**
 * @module LanguageFeatures
 * @description This module provides the `vscode.languages` API implementation,
 * managing the registration and invocation of all language feature providers.
 */

import { Layer } from "effect";

import { Live as LiveCancellation } from "../Cancellation.js";
import { Live as LiveCommands } from "../Commands.js";
import { Live as LiveDocuments } from "../Documents.js";
import { Live as LiveIpc } from "../Ipc.js";
import { Definition } from "./Definition.js";
import { Tag } from "./Service.js";

export { Tag, type Interface } from "./Service.js";

/**
 * The live implementation Layer for the LanguageFeatures service.
 * It has many core dependencies.
 */
export const Live = Layer.effect(Tag, Definition).pipe(
	Layer.provide(
		Layer.mergeAll(LiveIpc, LiveDocuments, LiveCancellation, LiveCommands),
	),
);
