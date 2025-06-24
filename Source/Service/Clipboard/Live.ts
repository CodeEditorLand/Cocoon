/*
 * File: Cocoon/Source/Service/Clipboard/Live.ts
 * Role: Provides the "live" implementation of the IClipboardService as a Layer.
 * Responsibilities:
 *   - This module defines the `Layer` that will be used to provide the live,
 *     production-ready implementation of the `ClipboardService` to the application.
 */

import { Layer } from "effect";
import { Definition } from "./Definition.js";
import { ClipboardService } from "./Service.js";
import type { IntegrationClipboardProblem } from "Source/Integration/Tauri/Clipboard/Error.js";
import type { ApplicationClipboardProblem } from "./Error.js";

/**
 * The live implementation `Layer` for the `ClipboardService`.
 *
 * It uses `Layer.effect` to construct the service instance from its `Definition`,
 * which is an `Effect`. This layer is self-contained and has no external service
 * dependencies. The error channel includes potential problems from both the
 * application and integration layers.
 */
const Live: Layer.Layer<
	ClipboardService,
	ApplicationClipboardProblem | IntegrationClipboardProblem,
	never
> = Layer.effect(ClipboardService, Definition);

export default Live;
