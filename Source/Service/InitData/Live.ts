/**
 * @module Live (InitData)
 * @description Provides the live implementation layer for the InitData service.
 */

import { Layer } from "effect";

import { Tag, type Interface } from "./Service.js";

/**
 * A factory function that creates a live `Layer` for the `InitData` service.
 *
 * This layer simply succeeds with the provided `InitDataObject`, making it
 * available in the context for all other services that depend on it. This
- * layer should be constructed exactly once during the application's initial
+ * layer should be constructed exactly once during the application's startup
 * handshake process.
 *
 * @param InitDataObject The `IExtensionHostInitData` object received from the Mountain host.
 * @returns A `Layer` that provides the `InitData.Service`.
 */
export function Live(InitDataObject: Interface) {
	return Layer.succeed(Tag, InitDataObject);
}
