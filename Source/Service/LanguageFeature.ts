/*
 * File: Cocoon/Source/Service/LanguageFeature.ts
 * Responsibility:
 * Modified: 2025-06-15 19:16:58 UTC
 * Dependency: ./LanguageFeature/Live.js, ./LanguageFeature/Service.js
 * Export: Live, Service
 */

/**
 * @module LanguageFeature
 * @description This module provides the `vscode.languages` API implementation,
 * managing the registration and invocation of all language feature providers.
 */

import Live from "./LanguageFeature/Live.js";
import Service from "./LanguageFeature/Service.js";

export { Service, Live };
