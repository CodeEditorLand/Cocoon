import { UriComponents } from '../../../../base/common/uri.js';
import { IWebWorkerServerRequestHandler, IWebWorkerServer } from '../../../../base/common/worker/webWorker.js';
import { ILocalFileSearchWorker, IWorkerFileSearchComplete, IWorkerFileSystemDirectoryHandle, IWorkerTextSearchComplete } from '../common/localFileSearchWorkerTypes.js';
import { IFileQueryProps, IFolderQuery, ITextQueryProps } from '../common/search.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
export declare function create(workerServer: IWebWorkerServer): IWebWorkerServerRequestHandler;
export declare class LocalFileSearchWorker implements ILocalFileSearchWorker, IWebWorkerServerRequestHandler {
    _requestHandlerBrand: any;
    private readonly host;
    cancellationTokens: Map<number, CancellationTokenSource>;
    constructor(workerServer: IWebWorkerServer);
    $cancelQuery(queryId: number): void;
    private registerCancellationToken;
    $listDirectory(handle: IWorkerFileSystemDirectoryHandle, query: IFileQueryProps<UriComponents>, folderQuery: IFolderQuery<UriComponents>, ignorePathCasing: boolean, queryId: number): Promise<IWorkerFileSearchComplete>;
    $searchDirectory(handle: IWorkerFileSystemDirectoryHandle, query: ITextQueryProps<UriComponents>, folderQuery: IFolderQuery<UriComponents>, ignorePathCasing: boolean, queryId: number): Promise<IWorkerTextSearchComplete>;
    private walkFolderQuery;
}
