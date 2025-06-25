import { Disposable } from '../../../../base/common/lifecycle.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
export interface IGettingStartedExperiment {
    cohort: number;
    experimentGroup: string;
    walkthroughId: string;
    iteration: number;
}
export declare const IGettingStartedExperimentService: import("../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<IGettingStartedExperimentService>;
export interface IGettingStartedExperimentService {
    readonly _serviceBrand: undefined;
    getCurrentExperiment(): IGettingStartedExperiment | undefined;
}
export declare enum GettingStartedExperimentGroup {
    New = "newExp",
    Control = "controlExp",
    Default = "defaultExp"
}
export declare class GettingStartedExperimentService extends Disposable implements IGettingStartedExperimentService {
    private readonly storageService;
    private readonly telemetryService;
    private readonly productService;
    readonly _serviceBrand: undefined;
    private readonly experiment;
    constructor(storageService: IStorageService, telemetryService: ITelemetryService, productService: IProductService);
    private getExperimentAllocation;
    private getOrCreateExperiment;
    private createNewExperiment;
    private sendExperimentTelemetry;
    getCurrentExperiment(): IGettingStartedExperiment | undefined;
}
