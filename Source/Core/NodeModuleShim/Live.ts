/*
 * File: Cocoon/Source/Core/NodeModuleShim/Live.ts
 * Responsibility: Provides the live implementation Layer for the NodeModuleShim service.
 * Modified: 2025-06-17 11:42:01 UTC
 */

/**
 * @module Live (NodeModuleShim)
 * @description Provides the live implementation Layer for the NodeModuleShim service.
 */

import { Layer } from "effect";

import InitDataService from "../../Service/InitData/Service.js";
import LogService from "../../Service/Log/Service.js";
import Definition from "./Definition.js";
import NodeModuleShimService from "./Service.js";

/**
 * The live implementation Layer for the NodeModuleShim service.
 * It correctly declares its dependencies on Log and InitData services.
 */
const Live: Layer.Layer<
	NodeModuleShimService,
	never,
	LogService | InitDataService
> = Layer.effect(NodeModuleShimService, Definition);

export default Live;
