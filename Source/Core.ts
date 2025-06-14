/**
 * @module Core
 * @description This is the aggregator module for all core services of the Cocoon
 * extension host. These services are fundamental to the runtime's operation,
 * managing the extension lifecycle, API creation, and module loading.
 */

import { Layer } from "effect";

import APIFactoryLive from "./Core/APIFactory/Live.js";
import ESMInterceptorLive from "./Core/ESMInterceptor/Live.js";
import ExtensionHostLive from "./Core/ExtensionHost/Live.js";
import ExtensionPathLive from "./Core/ExtensionPath/Live.js";
import HostKindPickerLive from "./Core/HostKindPicker/Live.js";
import NodeModuleShimLive from "./Core/NodeModuleShim/Live.js";
import RequireInterceptorLive from "./Core/RequireInterceptor/Live.js";

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
