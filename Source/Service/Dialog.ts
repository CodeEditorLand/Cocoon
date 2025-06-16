/*
 * File: Cocoon/Source/Service/Dialog.ts
 * Responsibility:
 * Modified: 2025-06-15 19:17:09 UTC
 * Dependency: ./Dialog/Error.js, ./Dialog/Live.js, ./Dialog/Service.js, ./Dialog/Type.js
 * Export: DialogError, Live, Service, Type
 */

/**
 * @module Dialog
 * @description This module provides the `vscode.window` dialog APIs, such as
 * `showOpenDialog` and `showSaveDialog`.
 */

import { DialogError } from "./Dialog/Error.js";
import Live from "./Dialog/Live.js";
import Service from "./Dialog/Service.js";
import * as Type from "./Dialog/Type.js";

export { Service, Live, Type, DialogError };
