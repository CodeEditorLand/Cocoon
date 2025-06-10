// --- Creating a single, composed layer for all core services ---

import { Layer } from "effect";

import { Live as LiveApiFactory } from "./ApiFactory/mod.js";
import { Live as LiveExtensionHost } from "./ExtensionHost/mod.js";
import { Live as LiveExtensionPaths } from "./ExtensionPaths/mod.js";
import { Live as LiveRequireInterceptor } from "./RequireInterceptor/mod.js";

/**
 * @module Core
 * @description This is the aggregator module for all core services of the Cocoon
 * extension host. These services are fundamental to the runtime's operation,
 * managing the extension lifecycle, API creation, and module loading.
 */

// --- Re-exporting the full public API (Tag, Interface, Live Layer) for each core service ---

export * as ApiFactory from "./ApiFactory/mod.js";
export * as ExtensionHost from "./ExtensionHost/mod.js";
export * as ExtensionPaths from "./ExtensionPaths/mod.js";
export * as RequireInterceptor from "./RequireInterceptor/mod.js";

/**
 * A single, composed layer that provides all core services of the extension host.
 * This simplifies the process of building the final application layer in `Index.ts`.
 */
export const CoreServicesLayer = Layer.mergeAll(
	LiveApiFactory,
	LiveExtensionHost,
	LiveExtensionPaths,
	LiveRequireInterceptor,
);
