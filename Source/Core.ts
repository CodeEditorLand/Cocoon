/**
 * @module Core
 * @description This is the aggregator module for all core services of the Cocoon
 * extension host. These services are fundamental to the runtime's operation,
 * managing the extension lifecycle, API creation, and module loading.
 */

import { Layer } from "effect";

import { Live as APIFactoryLive } from "./Core/APIFactory.js";
import { Live as ESMInterceptorLive } from "./Core/ESMInterceptor.js";
import { Live as ExtensionHostLive } from "./Core/ExtensionHost.js";
import { Live as ExtensionPathLive } from "./Core/ExtensionPath.js";
import { Live as HostKindPickerLive } from "./Core/HostKindPicker.js";
import { Live as NodeModuleShimLive } from "./Core/NodeModuleShim.js";
import { Live as RequireInterceptorLive } from "./Core/RequireInterceptor.js";

/**
 * A single, composed layer that provides all core services of the extension host.
 * This simplifies the process of building the final application layer in `Cocoon.ts`.
 */
export default Layer.mergeAll(
	APIFactoryLive,
	ESMInterceptorLive,
	ExtensionHostLive,
	ExtensionPathLive,
	HostKindPickerLive,
	NodeModuleShimLive,
	RequireInterceptorLive,
);
