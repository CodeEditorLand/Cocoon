/*
 * File: Cocoon/Source/Service/Extension.ts
 * Responsibility:
 * Modified: 2025-06-15 19:17:06 UTC
 * Dependency: ../Core/ExtensionHost.js, ./Extension/Definition.js, ./Extension/Service.js, effect
 * Export: Live, default
 */

/**
 * @module Extension
 * @description This module provides the `vscode.extensions` API implementation,
 * allowing extensions to introspect and activate other extensions.
 */

import { Layer } from "effect";

import { Live as ExtensionHostLive } from "../Core/ExtensionHost.js";
import Definition from "./Extension/Definition.js";
import Service from "./Extension/Service.js";

export { default as Service } from "./Extension/Service.js";

/**
 * The live implementation Layer for the Extension service.
 * It depends on the core ExtensionHost service to get information about
 * and activate other extensions.
 */
export const Live = Layer.effect(Service, Definition).pipe(
	Layer.provide(ExtensionHostLive),
);
