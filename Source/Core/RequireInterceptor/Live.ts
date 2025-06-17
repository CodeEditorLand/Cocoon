/*
 * File: Cocoon/Source/Core/RequireInterceptor/Live.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:38 UTC
 * Dependency: ../../Service/Log/Service.js, ../APIFactory/Service.js, ../ExtensionPath/Service.js, ../NodeModuleShim/Service.js, ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (RequireInterceptor)
 * @description The live implementation layer for the RequireInterceptor service.
 */

import { Layer } from "effect";

import type LogService from "../../Service/Log/Service.js";
import type APIFactoryService from "../APIFactory/Service.js";
import type ExtensionPathService from "../ExtensionPath/Service.js";
import NodeModuleShimService from "../NodeModuleShim/Service.js"; // FIX: Import the service tag directly.
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation layer for the RequireInterceptor service.
 * It correctly declares its dependencies on APIFactory, ExtensionPath, NodeModuleShim, and Log services.
 */
const Live: Layer.Layer<
	Service,
	never,
	| APIFactoryService
	| ExtensionPathService
	| NodeModuleShimService
	| LogService
> = Layer.effect(Service, Definition);

export default Live;
