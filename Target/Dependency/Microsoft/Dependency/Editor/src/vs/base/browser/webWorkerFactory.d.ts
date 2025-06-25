import { URI } from '../common/uri.js';
import { IWebWorkerClient } from '../common/worker/webWorker.js';
export declare function createBlobWorker(blobUrl: string, options?: WorkerOptions): Worker;
export interface IWebWorkerDescriptor {
    readonly esmModuleLocation: URI | undefined;
    readonly label: string | undefined;
}
export declare class WebWorkerDescriptor implements IWebWorkerDescriptor {
    readonly esmModuleLocation: URI;
    readonly label: string | undefined;
    constructor(esmModuleLocation: URI, label: string | undefined);
}
export declare function createWebWorker<T extends object>(esmModuleLocation: URI, label: string | undefined): IWebWorkerClient<T>;
export declare function createWebWorker<T extends object>(workerDescriptor: IWebWorkerDescriptor | Worker): IWebWorkerClient<T>;
