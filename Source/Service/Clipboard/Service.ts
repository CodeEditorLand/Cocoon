/*
 * File: Cocoon/Source/Service/Clipboard/Service.ts
 * Role: Defines the service interface and Effect.Service for the application-level
 *       clipboard service, which conforms to the `IClipboardService` from VS Code.
 * Responsibilities:
 *   - Declare the contract for the Clipboard service.
 *   - Provide an `Effect.Service` class that acts as both the service interface
 *     and the dependency injection tag.
 */

import { Effect } from "effect";
import type { IClipboardService } from "vs/platform/clipboard/common/clipboardService.js";

/**
 * The `Effect.Service` class for the Clipboard service.
 * This class defines the service interface and also serves as the `Context.Tag`.
 * It is an alias for VS Code's `IClipboardService` to ensure API compatibility.
 */
export class ClipboardService extends Effect.Service<IClipboardService>(
	"vscode/ClipboardService",
) {}
