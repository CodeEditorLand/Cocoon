import { UriComponents } from '../../../../../../base/common/uri.js';
import { IWebWorkerServer, IWebWorkerClient } from '../../../../../../base/common/worker/webWorker.js';
import { StateDeltas } from './textMateTokenizationWorker.worker.js';
export declare abstract class TextMateWorkerHost {
    static CHANNEL_NAME: string;
    static getChannel(workerServer: IWebWorkerServer): TextMateWorkerHost;
    static setChannel(workerClient: IWebWorkerClient<any>, obj: TextMateWorkerHost): void;
    abstract $readFile(_resource: UriComponents): Promise<string>;
    abstract $setTokensAndStates(controllerId: number, versionId: number, tokens: Uint8Array, lineEndStateDeltas: StateDeltas[]): Promise<void>;
    abstract $reportTokenizationTime(timeMs: number, languageId: string, sourceExtensionId: string | undefined, lineLength: number, isRandomSample: boolean): void;
}
