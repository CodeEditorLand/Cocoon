/*
 * File: Cocoon/Source/Service/Authentication.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:17:16 UTC
 * Dependency: ./Authentication/Error.js, ./Authentication/Live.js, ./Authentication/Service.js, ./Authentication/Type.js
 * Export: Error, Live, Service, Type
 */

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
