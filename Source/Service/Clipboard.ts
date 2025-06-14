/**
 * @module Clipboard
 * @description This module provides the `vscode.env.clipboard` API implementation,
 * proxying all clipboard operations to the Mountain host.
 */

import Live from "./Clipboard/Live.js";
import Service from "./Clipboard/Service.js";

export { Service, Live };
