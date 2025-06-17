/*
 * File: Cocoon/Source/Service/StoragePath.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:21 UTC
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
