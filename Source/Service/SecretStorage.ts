/*
 * File: Cocoon/Source/Service/SecretStorage.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:16:52 UTC
 * Dependency: ./SecretStorage/Error.js, ./SecretStorage/Live.js, ./SecretStorage/Service.js
 * Export: Error, Live, Service
 */

/**
 * @module SecretStorage
 * @description This module provides the `vscode.SecretStorage` API for securely
 * storing sensitive data by proxying to the OS keychain via Mountain.
 */

import * as Error from "./SecretStorage/Error.js";
import Live from "./SecretStorage/Live.js";
import Service from "./SecretStorage/Service.js";

export { Service, Live, Error };
