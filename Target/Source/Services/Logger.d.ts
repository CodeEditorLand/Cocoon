/**
 * @module Logger
 * @description
 * Implements the logging service for internal application logging.
 *
 * Architecture:
 * - Lifted from: src/vs/base/common/log.js (VSCode Dependency/Editor)
 * - Adapted from: Source/Archive/Logger.ts (borrowed working patterns)
 * - Mountain Integration: Forwards logs to Mountain for centralized logging
 *
 * Patterns borrowed from this file:
 * - Effect log function wrapping
 * - Extension ID context tracking
 * - Log level filtering
 *
 * New implementation includes:
 * - Enhanced context management with Ref
 * - Mountain log forwarding hooks
 * - Comprehensive TODOs for advanced logging features
 * - Structured log formatting
 *
 * Dependencies:
 * - IMountainClientService: For forwarding logs to Mountain (optional)
 *
 * TODOs:
 * - MEDIUM: Implement log persistence and rotation
 * - MEDIUM: Add log filtering by extension ID and level
 * - MEDIUM: Forward critical logs to Mountain
 * - LOW: Track log volume for performance monitoring
 * - ARCHITECTURE-PATTERN: src/vs/platform/log/common/logService.ts (structured logging)
 * - VSCODE-LIFT: src/vs/base/common/log.js (log formatting and levels)
 */
import { Effect } from "effect";
/**
 * @interface Logger
 * @description
 * The contract for the internal logging service.
 *
 * Specification: src/vs/base/common/log.js (ILogger)
 */
export interface Logger {
    readonly Trace: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
    readonly Debug: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
    readonly Info: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
    readonly Warn: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
    readonly Error: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
    readonly Fatal: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
    readonly SetExtensionId: (ExtensionId: string) => Effect.Effect<void>;
    readonly GetExtensionId: () => Effect.Effect<string>;
}
declare const LoggerService_base: Effect.Service.Class<LoggerService, "Service/Logger", {
    readonly effect: Effect.Effect<Logger, never, never>;
}>;
/**
 * @class LoggerService
 * @description
 * The Effect-TS service for the Logger service. Provides a simple, structured facade
 * over the main Effect logger, allowing other services to log messages at various
 * severity levels without directly depending on the `Effect` module's logging implementation.
 *
 * Architecture Pattern: src/vs/base/common/log.js (structured logging)
 * Implementation: Effect log functions with extension context annotation
 *
 * TODOs:
 * - PERSISTENCE: Implement log file persistence (MEDIUM)
 * - ROTATION: Add log rotation based on size and age (MEDIUM)
 * - FILTERING: Implement log filtering by extension and level (MEDIUM)
 * - FORWARDING: Forward critical logs to Mountain (MEDIUM)
 * - TELEMETRY: Track log volume for performance monitoring (LOW)
 */
export declare class LoggerService extends LoggerService_base {
}
export {};
//# sourceMappingURL=Logger.d.ts.map