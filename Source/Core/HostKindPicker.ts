/**
 * @module HostKindPicker (Core)
 * @description This module provides the HostKindPicker service, which determines if
 * an extension is compatible with the Cocoon (Node.js) extension host. It provides
 * the `Live` implementation Layer for the service.
 */

import Live from "./HostKindPicker/Live.js";
import Service from "./HostKindPicker/Service.js";

export { Service, Live };
