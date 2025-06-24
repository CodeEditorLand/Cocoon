/*
 * File: Cocoon/Source/Core/NodeModuleShim/Live.ts
 * Role: Provides the live implementation Layer for the NodeModuleShim service.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `NodeModuleShim` service instance
 *     and provides it with its necessary dependencies.
 */

import { Layer } from "effect";
import { Definition } from "./Definition.js";
import { NodeModuleShim } from "./Service.js";
import { InitData } from "../../Service/InitData/Service.js";
import { Logger } from "../../Service/Log/Service.js";

/**
 * The live implementation `Layer` for the `NodeModuleShim` service.
 * It correctly declares its dependencies on `Logger` and `InitData` services.
 */
const Live: Layer.Layer<NodeModuleShim, never, Logger | InitData> =
	Layer.effect(NodeModuleShim, Definition);

export default Live;
