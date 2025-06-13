/**
 * @module ExtensionPath (Core)
 * @description The main module for the ExtensionPath service, which maps file URIs
 * to their owner extension.
 */

import { Context, Effect, Layer } from "effect";

import { InitData } from "../../Service/InitData.js";
import { Definition } from "./ExtensionPath/Definition.js";

/**
 * The interface for the ExtensionPath service is the class definition itself.
 */
export type Interface = Definition;

/**
 * The Context.Tag for the ExtensionPath service.
 */
export const Tag = Context.Tag<Interface>("Core/ExtensionPath");

/**
 * The live implementation layer for the ExtensionPath service.
 * It depends on the InitData service to get the list of all installed extensions.
 */
export const Live = Layer.effect(
	Tag,
	Effect.map(InitData.Tag, (InitData) => new Definition(InitData.extensions)),
);
