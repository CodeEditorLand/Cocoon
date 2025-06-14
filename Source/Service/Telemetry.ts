/**
 * @module Telemetry
 * @description This module provides the `vscode.env.telemetry` API implementation,
 * handling event collection and forwarding to the host.
 */

import Live from "./Telemetry/Live.js";
import Service from "./Telemetry/Service.js";

export { Service, Live };
