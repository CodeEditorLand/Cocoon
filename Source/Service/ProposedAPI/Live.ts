/*
 * File: Cocoon/Source/Service/ProposedAPI/Live.ts
 * Role: Provides the "live" implementation Layer for the ProposedAPI service.
 * Responsibilities:
 *   - Defines the `Layer` that constructs the live `ProposedAPI` service instance
 *     and provides it with its necessary dependencies.
 */

import { Layer } from "effect";
import { Definition } from "./Definition.js";
import { ProposedAPI } from "./Service.js";
import { InitData } from "../InitData/Service.js";
import { Logger } from "../Log/Service.js";

/**
 * The live implementation `Layer` for the `ProposedAPI` service.
 * It depends on the `Logger` and `InitData` services.
 */
const Live: Layer.Layer<ProposedAPI, never, Logger | InitData> = Layer.effect(
	ProposedAPI,
	Definition,
);

export default Live;
