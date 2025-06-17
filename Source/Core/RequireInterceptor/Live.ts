/*
 * File: Cocoon/Source/Core/RequireInterceptor/Live.ts
 * Responsibility: Implements the live RequireInterceptor service layer for the Cocoon sidecar, integrating Node module shimming and API factory dependencies to enable VS Code extension compatibility by intercepting and modifying module loading behavior.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: ../../Service/Log/Live.js, ../APIFactory/Live.js, ../ExtensionPath/Live.js, ../NodeModuleShim/Live.js, ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (RequireInterceptor)
 * @description The live implementation layer for the RequireInterceptor service.
 */

import { Layer } from "effect";

import LogLive from "../../Service/Log/Live.js";
import APIFactoryLive from "../APIFactory/Live.js";
import ExtensionPathLive from "../ExtensionPath/Live.js";
import NodeModuleShimLive from "../NodeModuleShim/Live.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation layer for the RequireInterceptor service.
 * It has dependencies on the APIFactory, ExtensionPath, NodeModuleShim, and Log services,
 * which are provided to it here.
 */
export default Layer.effect(Service, Definition).pipe(
	Layer.provide(
		Layer.mergeAll(
			APIFactoryLive,
			ExtensionPathLive,
			NodeModuleShimLive,
			LogLive,
		),
	),
);
