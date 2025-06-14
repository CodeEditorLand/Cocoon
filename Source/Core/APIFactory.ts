/**
 * @module APIFactory (Core)
 * @description The main module for the `APIFactory` service, which is
 * responsible for creating sandboxed `vscode` API objects for extensions.
 */

import Live from "./APIFactory/Live.js";
import Service from "./APIFactory/Service.js";

export { Service, Live };
