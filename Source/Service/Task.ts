/*
 * File: Cocoon/Source/Service/Task.ts
 * Responsibility:
 * Modified: 2025-06-15 19:16:49 UTC
 * Dependency: ./Task/Live.js, ./Task/Service.js, ./Task/Type.js
 * Export: Live, Service, Type
 */

/**
 * @module Task
 * @description This module provides the `vscode.tasks` API implementation, allowing
 * extensions to define, provide, and execute custom build/run tasks.
 */

import Live from "./Task/Live.js";
import Service from "./Task/Service.js";
import * as Type from "./Task/Type.js";

export { Service, Live, Type };
