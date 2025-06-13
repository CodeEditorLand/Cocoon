/**
 * @module ExtensionPaths (Core)
 * @description The main module for the ExtensionPaths service, which maps file URIs
 * to their owner extension.
 */

import { Context, Effect, Layer } from "effect";

import { InitDataService } from "../../Service/InitData.js";
import { Definition } from "./Definition.js";

/**
 * The interface for the ExtensionPaths service is the class definition itself.
 */
export type Interface = Definition;

/**
 * The Context.Tag for the ExtensionPaths service.
 */
export const Tag = Context.Tag<Interface>("Core/ExtensionPaths");

/**
 * The live implementation layer for the ExtensionPaths service.
 * It depends on the InitDataService to get the list of all installed extensions.
 */
export const Live = Layer.effect(
	Tag,
	Effect.map(
		InitDataService,
		(InitData) => new Definition(InitData.extensions),
	),
);
