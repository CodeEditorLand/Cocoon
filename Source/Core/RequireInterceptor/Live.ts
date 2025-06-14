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
const Live = Layer.effect(Service, Definition).pipe(
	Layer.provide(
		Layer.mergeAll(
			APIFactoryLive,
			ExtensionPathLive,
			NodeModuleShimLive,
			LogLive,
		),
	),
);

export default Live;
