import { Event } from '../../../../base/common/event.js';
import { Disposable, IDisposable } from '../../../../base/common/lifecycle.js';
import { ReadableStreamEvents } from '../../../../base/common/stream.js';
import { URI } from '../../../../base/common/uri.js';
import { FileSystemProviderCapabilities, FileType, IFileService, IFileSystemProviderWithFileAtomicReadCapability, IFileSystemProviderWithFileReadStreamCapability, IFileSystemProviderWithFileReadWriteCapability, IStat } from '../../../../platform/files/common/files.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';
import { IChatService } from './chatService.js';
export declare class ChatResponseResourceFileSystemProvider extends Disposable implements IWorkbenchContribution, IFileSystemProviderWithFileReadWriteCapability, IFileSystemProviderWithFileAtomicReadCapability, IFileSystemProviderWithFileReadStreamCapability {
    private readonly chatService;
    private readonly _fileService;
    static readonly ID = "workbench.contrib.chatResponseResourceFileSystemProvider";
    readonly onDidChangeCapabilities: Event<any>;
    readonly onDidChangeFile: Event<any>;
    readonly capabilities: FileSystemProviderCapabilities;
    constructor(chatService: IChatService, _fileService: IFileService);
    readFile(resource: URI): Promise<Uint8Array>;
    readFileStream(resource: URI): ReadableStreamEvents<Uint8Array>;
    stat(resource: URI): Promise<IStat>;
    delete(): Promise<void>;
    watch(): IDisposable;
    mkdir(): Promise<void>;
    readdir(): Promise<[string, FileType][]>;
    rename(): Promise<void>;
    writeFile(): Promise<void>;
    private lookupURI;
}
