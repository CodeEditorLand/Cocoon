/*
 * File: Cocoon/Source/Service/Telemetry/Service.ts
 * Responsibility:
 * Modified: 2025-06-15 19:16:48 UTC
 * Dependency: effect, vs/workbench/api/common/extHostTelemetry.js
 * Export: TelemetryService
 */

/**
 * @module Service (Telemetry)
 * @description Defines the interface and Context.Tag for the Telemetry service.
 */

import { Context } from "effect";
import type { IExtHostTelemetry } from "vs/workbench/api/common/extHostTelemetry.js";

/**
 * The `Context.Tag` for the `vscode.env.telemetry` API service.
 */
export default class TelemetryService extends Context.Tag("Service/Telemetry")<
	TelemetryService,
	IExtHostTelemetry
>() {}
