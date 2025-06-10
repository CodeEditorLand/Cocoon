/**
 * @module Service (InitData)
 * @description Defines the interface and Context.Tag for the InitData service.
 */

import { Context } from "effect";

import type { IExtensionHostInitData } from "../../Type/vscode-proposed.js";

/**
 * The service interface for the InitData service. It is an alias for the
 * `IExtensionHostInitData` type, which represents the full configuration
 * payload from the host.
 */
export type Interface = IExtensionHostInitData;

/**
 * The Context.Tag for the InitData service. Other services will use this Tag
 * to declare their dependency on the initial host configuration data.
 */
export const Tag = Context.Tag<Interface>("Service/InitData");
