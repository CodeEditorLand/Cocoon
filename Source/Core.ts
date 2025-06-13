// --- Creating a single, composed layer for all core services ---

import { Layer } from "effect";

import { Live as LiveAPIFactory } from "./Core/APIFactory.js";
import { Live as LiveExtensionHost } from "./Core/ExtensionHost.js";
import { Live as LiveExtensionPaths } from "./Core/ExtensionPath.js";
import { Live as LiveRequireInterceptor } from "./Core/RequireInterceptor.js";

/**
 * @module Core
 * @description This is the aggregator module for all core services of the Cocoon
 * extension host. These services are fundamental to the runtime's operation,
 * managing the extension lifecycle, API creation, and module loading.
 */

// --- Re-exporting the full public API (Tag, Interface, Live Layer) for each core service ---

export * as APIFactory from "./Core/APIFactory.js";
export * as ExtensionHost from "./Core/ExtensionHost.js";
export * as ExtensionPaths from "./Core/ExtensionPath.js";
export * as RequireInterceptor from "./Core/RequireInterceptor.js";

/**
 * A single, composed layer that provides all core services of the extension host.
 * This simplifies the process of building the final application layer in `Index.ts`.
 */
export const CoreServicesLayer = Layer.mergeAll(
	LiveAPIFactory,
	LiveExtensionHost,
	LiveExtensionPaths,
	LiveRequireInterceptor,
);
