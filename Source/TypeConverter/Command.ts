/*
 * File: Cocoon/Source/TypeConverter/Command.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:55 UTC
 * Dependency: ./Command/Definition.js, ./Command/Service.js, ./Command/Type.js
 * Export: Definition, Type, type Service
 */

/**
 * @module Command (TypeConverter)
 * @description This module provides the `CommandConverter` for marshalling `vscode.Command`
 * objects for IPC, and the `APICommand` structure for defining built-in commands.
 * It serves as the main entry point for command-related type conversion.
 */

import Definition from "./Command/Definition.js";
import type Service from "./Command/Service.js";
import * as Type from "./Command/Type.js";

export { Definition, type Service, Type };
