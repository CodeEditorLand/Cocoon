/**
 * @module Storage
 * @description This module provides the `vscode.Memento` API for persistent
 * key-value storage, proxying all operations to the Mountain host.
 */

import Live from "./Storage/Live.js";
import Service from "./Storage/Service.js";

export { Service, Live };
