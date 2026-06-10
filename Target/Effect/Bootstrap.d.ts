/**
 * @module Effect/Bootstrap
 * @description
 * Lean async bootstrap orchestration for Cocoon Extension Host.
 * All stages are plain async functions - no Effect-TS machinery.
 */
export interface BootstrapOptions {
    readonly debugMode?: boolean;
    readonly verboseLogging?: boolean;
    readonly enablePerformanceTracking?: boolean;
    readonly skipHealthCheck?: boolean;
}
export interface StageResult {
    readonly stageName: string;
    readonly success: boolean;
    readonly duration: number;
    readonly error: Error | undefined;
}
export interface BootstrapResult {
    readonly success: boolean;
    readonly totalDuration: number;
    readonly stages: ReadonlyArray<StageResult>;
    readonly error: Error | undefined;
}
export interface BootstrapService {
    readonly run: (options?: BootstrapOptions) => Promise<BootstrapResult>;
}
export declare const BootstrapTag: {
    _tag: "Cocoon/Bootstrap";
};
export declare const BootstrapLive: BootstrapService;
export declare const runBootstrap: (options?: BootstrapOptions) => Promise<BootstrapResult>;
export declare const makeMockBootstrap: () => BootstrapService;
export declare const BootstrapMock: BootstrapService;
//# sourceMappingURL=Bootstrap.d.ts.map