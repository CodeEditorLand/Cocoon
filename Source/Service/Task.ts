/**
 * @module Task
 * @description This module provides the `vscode.tasks` API implementation, allowing
 * extensions to define, provide, and execute custom build/run tasks.
 */

import Live from "./Task/Live.js";
import Service from "./Task/Service.js";
import * as Type from "./Task/Type.js";

export { Service, Live, Type };
