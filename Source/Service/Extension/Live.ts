/**
 * @module Live (Extension)
 * @description The live implementation Layer for the Extension service.
 */

import { Layer } from "effect";

import ExtensionHostLive from "../../Core/ExtensionHost/Live.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the Extension service.
 * It depends on the core ExtensionHost service to get information about
 * and activate other extensions.
 */
export default Layer.effect(Service, Definition).pipe(
	Layer.provide(ExtensionHostLive),
);
