/**
 * @module Service (Telemetry)
 * @description Defines the interface and Context.Tag for the Telemetry service.
 */

import { Context } from "effect";
import type { IExtHostTelemetry } from "vs/workbench/api/common/extHostTelemetry.js";

/**
 * The `Context.Tag` for the `vscode.env.telemetry` API service.
 */
export default class extends Context.Tag("Service/Telemetry")<
	any,
	IExtHostTelemetry
>() {}
