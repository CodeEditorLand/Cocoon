/*
 * File: Cocoon/Source/Core.ts
 * Responsibility: The main barrel (aggregator) file for all core services.
 * Modified: 2025-06-17 10:52:55 UTC
 */

/**
 * @module Core
 * @description This module aggregates and re-exports all core services, which
 * are responsible for the foundational aspects of the extension host runtime,
 * such as API sandboxing and module loading interception.
 * This file uses explicit, aliased imports and exports to prevent name collisions.
 */

import * as APIFactory from "./Core/APIFactory.js";
import * as ESMInterceptor from "./Core/ESMInterceptor.js";
import * as ExtensionHost from "./Core/ExtensionHost.js";
import * as ExtensionPath from "./Core/ExtensionPath.js";
import * as HostKindPicker from "./Core/HostKindPicker.js";
import * as NodeModuleShim from "./Core/NodeModuleShim.js";
import * as RequireInterceptor from "./Core/RequireInterceptor.js";

// --- Live Layers ---
const APIFactoryLive = APIFactory.Live;
const ESMInterceptorLive = ESMInterceptor.Live;
const ExtensionHostLive = ExtensionHost.Live;
const ExtensionPathLive = ExtensionPath.Live;
const HostKindPickerLive = HostKindPicker.Live;
const NodeModuleShimLive = NodeModuleShim.Live;
const RequireInterceptorLive = RequireInterceptor.Live;

// --- Service Tags ---
const APIFactoryService = APIFactory.Service;
const ESMInterceptorService = ESMInterceptor.Service;
const ExtensionHostService = ExtensionHost.Service;
const ExtensionPathService = ExtensionPath.Service;
const HostKindPickerService = HostKindPicker.Service;
const NodeModuleShimService = NodeModuleShim.Service;
const RequireInterceptorService = RequireInterceptor.Service;

// --- Other Exports (e.g., custom errors) ---
const NodeModuleShimError = NodeModuleShim.Error;

export {
	// Live Layers
	APIFactoryLive,
	ESMInterceptorLive,
	ExtensionHostLive,
	ExtensionPathLive,
	HostKindPickerLive,
	NodeModuleShimLive,
	RequireInterceptorLive,
	// Service Tags
	APIFactoryService,
	ESMInterceptorService,
	ExtensionHostService,
	ExtensionPathService,
	HostKindPickerService,
	NodeModuleShimService,
	RequireInterceptorService,
	// Other Exports
	NodeModuleShimError,
};
