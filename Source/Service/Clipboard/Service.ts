/*
 * File: Cocoon/Source/Service/Clipboard/Service.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:43 UTC
 * Dependency: effect, vscode
 * Export: ClipboardService
 */

/**
 * @module Service (Clipboard)
 * @description Defines the interface and Context.Tag for the Clipboard service.
 * This service implements the `vscode.env.clipboard` API.
 */

import { Context } from "effect";
import type { Clipboard } from "vscode";

/**
 * The Context.Tag for the Clipboard service.
 */
export default class ClipboardService extends Context.Tag("Service/Clipboard")<
	ClipboardService,
	Clipboard
>() {}
