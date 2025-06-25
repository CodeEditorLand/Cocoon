import { ProcessItem } from '../../../base/common/processes.js';
import { IRemoteDiagnosticError, PerformanceInfo, SystemInfo } from '../../diagnostics/common/diagnostics.js';
export interface WindowStyles {
    backgroundColor?: string;
    color?: string;
}
export interface WindowData {
    styles: WindowStyles;
    zoomLevel: number;
}
export declare enum IssueSource {
    VSCode = "vscode",
    Extension = "extension",
    Marketplace = "marketplace"
}
export interface ISettingSearchResult {
    extensionId: string;
    key: string;
    score: number;
}
export declare const IProcessService: import("../../instantiation/common/instantiation.js").ServiceIdentifier<IProcessService>;
export interface IResolvedProcessInformation {
    readonly pidToNames: [number, string][];
    readonly processes: {
        readonly name: string;
        readonly rootProcess: ProcessItem | IRemoteDiagnosticError;
    }[];
}
export interface IProcessService {
    readonly _serviceBrand: undefined;
    resolveProcesses(): Promise<IResolvedProcessInformation>;
    getSystemStatus(): Promise<string>;
    getSystemInfo(): Promise<SystemInfo>;
    getPerformanceInfo(): Promise<PerformanceInfo>;
}
