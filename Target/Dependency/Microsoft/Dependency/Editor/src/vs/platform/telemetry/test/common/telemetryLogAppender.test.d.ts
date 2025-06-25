import { Event } from '../../../../base/common/event.js';
import { AbstractLogger, ILogger, ILoggerService, LogLevel } from '../../../log/common/log.js';
declare class TestTelemetryLogger extends AbstractLogger implements ILogger {
    logs: string[];
    constructor(logLevel?: LogLevel);
    trace(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string | Error, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    flush(): void;
}
export declare class TestTelemetryLoggerService implements ILoggerService {
    private readonly logLevel;
    _serviceBrand: undefined;
    logger?: TestTelemetryLogger;
    constructor(logLevel: LogLevel);
    getLogger(): TestTelemetryLogger | undefined;
    createLogger(): TestTelemetryLogger;
    onDidChangeVisibility: Event<any>;
    onDidChangeLogLevel: Event<any>;
    onDidChangeLoggers: Event<any>;
    setLogLevel(): void;
    getLogLevel(): LogLevel;
    setVisibility(): void;
    getDefaultLogLevel(): LogLevel;
    registerLogger(): void;
    deregisterLogger(): void;
    getRegisteredLoggers(): never[];
    getRegisteredLogger(): undefined;
}
export {};
