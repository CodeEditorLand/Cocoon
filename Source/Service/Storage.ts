/*
 * File: Cocoon/Source/Service/Storage.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:16:50 UTC
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
