import { IWebWorkerClient, IWebWorkerServer } from '../../../../base/common/worker/webWorker.js';
export declare abstract class LanguageDetectionWorkerHost {
    static CHANNEL_NAME: string;
    static getChannel(workerServer: IWebWorkerServer): LanguageDetectionWorkerHost;
    static setChannel(workerClient: IWebWorkerClient<any>, obj: LanguageDetectionWorkerHost): void;
    abstract $getIndexJsUri(): Promise<string>;
    abstract $getLanguageId(languageIdOrExt: string | undefined): Promise<string | undefined>;
    abstract $sendTelemetryEvent(languages: string[], confidences: number[], timeSpent: number): Promise<void>;
    abstract $getRegexpModelUri(): Promise<string>;
    abstract $getModelJsonUri(): Promise<string>;
    abstract $getWeightsUri(): Promise<string>;
}
export interface ILanguageDetectionWorker {
    $detectLanguage(uri: string, langBiases: Record<string, number> | undefined, preferHistory: boolean, supportedLangs?: string[]): Promise<string | undefined>;
}
