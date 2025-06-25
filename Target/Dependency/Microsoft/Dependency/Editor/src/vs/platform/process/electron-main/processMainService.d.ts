import { IDiagnosticsService, PerformanceInfo, SystemInfo } from '../../diagnostics/common/diagnostics.js';
import { IDiagnosticsMainService } from '../../diagnostics/electron-main/diagnosticsMainService.js';
import { IProcessService, IResolvedProcessInformation } from '../common/process.js';
import { ILogService } from '../../log/common/log.js';
export declare class ProcessMainService implements IProcessService {
    private readonly logService;
    private readonly diagnosticsService;
    private readonly diagnosticsMainService;
    readonly _serviceBrand: undefined;
    constructor(logService: ILogService, diagnosticsService: IDiagnosticsService, diagnosticsMainService: IDiagnosticsMainService);
    resolveProcesses(): Promise<IResolvedProcessInformation>;
    getSystemStatus(): Promise<string>;
    getSystemInfo(): Promise<SystemInfo>;
    getPerformanceInfo(): Promise<PerformanceInfo>;
}
