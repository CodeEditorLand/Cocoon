/*
 * File: Cocoon/Source/Service/Clipboard/Service.ts
 *
 * This file defines the interface and Context.Tag for the Clipboard service,
 * which implements the `vscode.env.clipboard` API.
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
