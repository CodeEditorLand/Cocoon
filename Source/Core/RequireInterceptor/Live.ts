/*
 * File: Cocoon/Source/Core/RequireInterceptor/Live.ts
 * Responsibility: Implements the live RequireInterceptor service layer.
 * Modified: 2025-06-17 10:52:54 UTC
 */

/**
 * @module Live (RequireInterceptor)
 * @description The live implementation layer for the RequireInterceptor service.
 */

import { Layer } from "effect";

import type LogService from "../../Service/Log/Service.js";
import type APIFactoryService from "../APIFactory/Service.js";
import type ExtensionPathService from "../ExtensionPath/Service.js";
import type NodeModuleShimService from "../NodeModuleShim/Service.js";
import Definition from "./Definition.js";
// FIX: Import the named `RequireInterceptorService` instead of a default export.
import RequireInterceptorService from "./Service.js";

/**
 * The live implementation layer for the RequireInterceptor service.
 * It correctly declares its dependencies on APIFactory, ExtensionPath, NodeModuleShim, and Log services.
 */
const Live: Layer.Layer<
	RequireInterceptorService,
	never,
	| APIFactoryService
	| ExtensionPathService
	| NodeModuleShimService
	| LogService
> = Layer.effect(RequireInterceptorService, Definition);

export default Live;
