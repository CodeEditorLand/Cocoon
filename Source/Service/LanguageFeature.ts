/*
 * File: Cocoon/Source/Service/LanguageFeature.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:27 UTC
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
