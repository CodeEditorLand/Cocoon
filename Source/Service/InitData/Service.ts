/**
 * @module Service (InitData)
 * @description Defines the interface and Context.Tag for the InitData service.
 * This is a simple value service that holds the initial data payload sent from
 * the Mountain host process upon startup.
 */

import { Context } from "effect";
import type { IExtensionHostInitData } from "vs/workbench/services/extensions/common/extensionHostProtocol.js";

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
