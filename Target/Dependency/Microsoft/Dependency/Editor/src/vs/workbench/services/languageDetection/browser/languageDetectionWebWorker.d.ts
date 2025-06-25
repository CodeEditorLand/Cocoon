import { IWebWorkerServerRequestHandler, IWebWorkerServer } from '../../../../base/common/worker/webWorker.js';
import { ILanguageDetectionWorker } from './languageDetectionWorker.protocol.js';
export declare function create(workerServer: IWebWorkerServer): IWebWorkerServerRequestHandler;
/**
 * @internal
 */
export declare class LanguageDetectionWorker implements ILanguageDetectionWorker {
    _requestHandlerBrand: any;
    private static readonly expectedRelativeConfidence;
    private static readonly positiveConfidenceCorrectionBucket1;
    private static readonly positiveConfidenceCorrectionBucket2;
    private static readonly negativeConfidenceCorrection;
    private readonly _workerTextModelSyncServer;
    private readonly _host;
    private _regexpModel;
    private _regexpLoadFailed;
    private _modelOperations;
    private _loadFailed;
    private modelIdToCoreId;
    constructor(workerServer: IWebWorkerServer);
    $detectLanguage(uri: string, langBiases: Record<string, number> | undefined, preferHistory: boolean, supportedLangs?: string[]): Promise<string | undefined>;
    private getTextForDetection;
    private getRegexpModel;
    private runRegexpModel;
    private getModelOperations;
    private adjustLanguageConfidence;
    private detectLanguagesImpl;
}
