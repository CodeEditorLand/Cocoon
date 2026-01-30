/**
 * @module Logger (ARCHIVED)
 * @description
 * ARCHIVED - This file has been adapted and moved to Source/Services/Logger.ts
 *
 * Patterns borrowed from this file:
 * - Effect log function wrapping
 * - Extension ID context tracking
 * - Log level filtering
 *
 * New implementation in Source/Services/Logger.ts includes:
 * - Enhanced context management with Ref
 * - Mountain log forwarding hooks
 * - Comprehensive TODOs for advanced logging features
 * - Structured log formatting
 *
 * Archive kept for reference during further implementation work.
 *
 * Original description: Defines the service for internal application logging. This service
 * provides a simple, structured facade over the main Effect logger, allowing
 * other services to log messages at various severity levels without directly
 * depending on the `Effect` module's logging implementation.
 */
import { Effect } from "effect";
/**
 * @interface Logger
 * @description The contract for the internal logging service.
 */
export interface Logger {
    readonly Trace: (Message: string, ...Data: unknown[]) => Effect.Effect<void, never, never>;
    readonly Debug: (Message: string, ...Data: unknown[]) => Effect.Effect<void, never, never>;
    readonly Info: (Message: string, ...Data: unknown[]) => Effect.Effect<void, never, never>;
    readonly Warn: (Message: string, ...Data: unknown[]) => Effect.Effect<void, never, never>;
    readonly Error: (Message: string, ...Data: unknown[]) => Effect.Effect<void, never, never>;
    readonly Fatal: (Message: string, ...Data: unknown[]) => Effect.Effect<void, never, never>;
}
declare const LoggerService_base: Effect.Service.Class<LoggerService, "Service/Logger", {
    readonly sync: () => {
        Trace: (Message: string, ...Data: unknown[]) => Effect.Effect<void, never, never>;
        Debug: (Message: string, ...Data: unknown[]) => Effect.Effect<void, never, never>;
        Info: (Message: string, ...Data: unknown[]) => Effect.Effect<void, never, never>;
        Warn: (Message: string, ...Data: unknown[]) => Effect.Effect<void, never, never>;
        Error: (Message: string, ...Data: unknown[]) => Effect.Effect<void, never, never>;
        Fatal: (Message: string, ...Data: unknown[]) => Effect.Effect<void, never, never>;
    };
}>;
/**
 * @class Logger
 * @description The `Effect.Service` for the Logger service. Its methods map
 * directly to the corresponding `Effect.log*` functions, providing a consistent
 * logging API for use throughout the application. It automatically annotates
 * log messages with any additional data provided.
 */
export declare class LoggerService extends LoggerService_base {
}
export {};
//# sourceMappingURL=Logger.d.ts.map