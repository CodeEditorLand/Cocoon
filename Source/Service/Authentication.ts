/**
 * @module Authentication
 * @description This module provides the `vscode.authentication` API, allowing extensions
 * to request authentication sessions and for Cocoon to register its own auth providers.
 */

import * as Error from "./Authentication/Error.js";
import Live from "./Authentication/Live.js";
import Service from "./Authentication/Service.js";
import * as Type from "./Authentication/Type.js";

export { Service, Live, Error, Type };
