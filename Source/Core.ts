/**
 * @module Core
 * @description This is the aggregator module for all core services of the Cocoon
 * extension host. These services are fundamental to the runtime's operation,
 * managing the extension lifecycle, API creation, and module loading.
 */

import { Layer } from "effect";

import { Live as LiveAPIFactory } from "./Core/APIFactory.js";
import { Live as LiveESMInterceptor } from "./Core/ESMInterceptor.js";
import { Live as LiveExtensionHost } from "./Core/ExtensionHost.js";
import { Live as LiveExtensionPath } from "./Core/ExtensionPath.js";
import { Live as LiveHostKindPicker } from "./Core/HostKindPicker.js";
import { Live as LiveNodeModuleShim } from "./Core/NodeModuleShim.js";
import { Live as LiveRequireInterceptor } from "./Core/RequireInterceptor.js";

// --- Re-exporting the full public API (Tag, Interface, Live Layer) for each core service ---

export * as APIFactory from "./Core/APIFactory.js";
export * as ESMInterceptor from "./Core/ESMInterceptor.js";
export * as ExtensionHost from "./Core/ExtensionHost.js";
export * as ExtensionPath from "./Core/ExtensionPath.js";
export * as HostKindPicker from "./Core/HostKindPicker.js";
export * as NodeModuleShim from "./Core/NodeModuleShim.js";
export * as RequireInterceptor from "./Core/RequireInterceptor.js";

/**
 * A single, composed layer that provides all core services of the extension host.
 * This simplifies the process of building the final application layer in `Cocoon.ts`.
 */
export const CoreServiceLayer = Layer.mergeAll(
	LiveAPIFactory,
	LiveESMInterceptor,
	LiveExtensionHost,
	LiveExtensionPath,
	LiveHostKindPicker,
	LiveNodeModuleShim,
	LiveRequireInterceptor,
);
