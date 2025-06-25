import { ILink } from '../../../../editor/common/languages.js';
import { URI } from '../../../../base/common/uri.js';
import { IWebWorkerServerRequestHandler, IWebWorkerServer } from '../../../../base/common/worker/webWorker.js';
export interface IResourceCreator {
    toResource: (folderRelativePath: string) => URI | null;
}
export declare class OutputLinkComputer implements IWebWorkerServerRequestHandler {
    _requestHandlerBrand: any;
    private readonly workerTextModelSyncServer;
    private patterns;
    constructor(workerServer: IWebWorkerServer);
    $setWorkspaceFolders(workspaceFolders: string[]): void;
    private computePatterns;
    private getModel;
    $computeLinks(uri: string): ILink[];
    static createPatterns(workspaceFolder: URI): RegExp[];
    /**
     * Detect links. Made static to allow for tests.
     */
    static detectLinks(line: string, lineIndex: number, patterns: RegExp[], resourceCreator: IResourceCreator): ILink[];
}
export declare function create(workerServer: IWebWorkerServer): OutputLinkComputer;
