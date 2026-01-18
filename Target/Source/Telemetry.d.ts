/**
 * @module Telemetry
 * @description Defines the service that implements the `vscode.env.telemetry` API.
 * It handles the collection and forwarding of telemetry and error events to the
 * host process, respecting the user's configured privacy and logging levels.
 */
import { Effect } from "effect";
declare const TelemetryService_base: Effect.Service.Class<IExtHostTelemetry, "Service/Telemetry", {
    readonly effect: Effect.Effect<IExtHostTelemetry, never, any>;
}>;
/**
 * @class TelemetryService
 * @description The `Effect.Service` for the Telemetry service.
 */
export declare class TelemetryService extends TelemetryService_base {
}
export {};
//# sourceMappingURL=Telemetry.d.ts.map