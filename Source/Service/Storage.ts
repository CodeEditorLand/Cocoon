/*
 * File: Cocoon/Source/Service/Storage.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:22 UTC
 * Dependency: ./Storage/Live.js, ./Storage/Service.js
 * Export: Live, Service
 */

/**
 * @module Storage
 * @description This module provides the `vscode.Memento` API for persistent
 * key-value storage, proxying all operations to the Mountain host.
 */

import Live from "./Storage/Live.js";
import Service from "./Storage/Service.js";

export { Service, Live };
