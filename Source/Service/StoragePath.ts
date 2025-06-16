/*
 * File: Cocoon/Source/Service/StoragePath.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:16:50 UTC
 * Dependency: ./StoragePath/Live.js, ./StoragePath/Service.js
 * Export: Live, Service
 */

/**
 * @module StoragePath
 * @description This module provides the StoragePath service, which resolves
 * filesystem URIs for extension-specific storage.
 */

import Live from "./StoragePath/Live.js";
import Service from "./StoragePath/Service.js";

export { Service, Live };
