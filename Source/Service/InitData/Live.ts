/*
 * File: Cocoon/Source/Service/InitData/Live.ts
 * Responsibility: Provides the initialization data received from the Mountain backend to the Cocoon sidecar's extension host, enabling VS Code extensions to access critical runtime configuration during their startup process.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: ./Service.js, effect, vs/workbench/services/extensions/common/extensionHostProtocol.js
 */

/**
 * @module Live (InitData)
 * @description Provides the live implementation layer for the InitData service.
 */

import { Layer } from "effect";
import type { IExtensionHostInitData } from "vs/workbench/services/extensions/common/extensionHostProtocol.js";

import Service from "./Service.js";

/**
 * A factory function that creates a live `Layer` for the `InitData` service.
 *
 * This layer simply succeeds with the provided `InitDataObject`, making it
 * available in the context for all other services that depend on it. This
 * layer should be constructed exactly once during the application's startup
 * handshake process.
 *
 * @param InitDataObject The `IExtensionHostInitData` object received from the Mountain host.
 * @returns A `Layer` that provides the `InitData.Service`.
 */
export default (InitDataObject: IExtensionHostInitData) =>
	Layer.succeed(Service, InitDataObject);
