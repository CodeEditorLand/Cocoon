/**
 * @module Live (IPC/ProtocolAdapter)
 * @description Provides a `Layer` for the `ProtocolAdapter` service.
 */

import { Layer } from "effect";

import type ClientService from "../Client/Service.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation `Layer` for the `ProtocolAdapter` service.
 * It correctly declares its dependency on `ClientService`.
 */
const Live: Layer.Layer<Service, never, ClientService> = Layer.effect(
	Service,

	Definition,
);

export default Live;
