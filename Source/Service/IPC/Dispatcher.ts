/**
 * @module Dispatcher (IPC)
 * @description Provides the Dispatcher service, which routes all incoming RPC
 * messages from the Mountain host to the appropriate handlers within Cocoon.
 */

import Live from "./Dispatcher/Live.js";
import Service from "./Dispatcher/Service.js";

export { Service, Live };
