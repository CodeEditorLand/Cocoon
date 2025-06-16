/**
 * @module IPCConfiguration
 * @description Aggregates and exports the IPCConfiguration service, which provides
 * the network addresses required for communication between Cocoon and Mountain.
 */

import type Definition from "./IPCConfiguration/Definition.js";
import Live from "./IPCConfiguration/Live.js";
import Service from "./IPCConfiguration/Service.js";

export { Service, Definition, Live };
