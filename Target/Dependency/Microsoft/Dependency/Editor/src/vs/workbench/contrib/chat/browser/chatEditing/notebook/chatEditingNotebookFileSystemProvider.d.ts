import { VSBuffer } from '../../../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { Event } from '../../../../../../base/common/event.js';
import { Disposable, IDisposable } from '../../../../../../base/common/lifecycle.js';
import { ReadableStreamEvents } from '../../../../../../base/common/stream.js';
import { URI } from '../../../../../../base/common/uri.js';
import { FileSystemProviderCapabilities, FileType, IFileChange, IFileDeleteOptions, IFileOpenOptions, IFileOverwriteOptions, IFileReadStreamOptions, IFileService, IFileSystemProvider, IFileWriteOptions, IStat, IWatchOptions } from '../../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchContribution } from '../../../../../common/contributions.js';
import { INotebookService } from '../../../../notebook/common/notebookService.js';
import { IChatEditingService } from '../../../common/chatEditingService.js';
export declare class ChatEditingNotebookFileSystemProviderContrib extends Disposable implements IWorkbenchContribution {
    private readonly fileService;
    static ID: string;
    constructor(fileService: IFileService, instantiationService: IInstantiationService);
}
export declare class ChatEditingNotebookFileSystemProvider implements IFileSystemProvider {
    private readonly _chatEditingService;
    private readonly notebookService;
    private static registeredFiles;
    readonly capabilities: FileSystemProviderCapabilities;
    static registerFile(resource: URI, buffer: VSBuffer): IDisposable;
    constructor(_chatEditingService: IChatEditingService, notebookService: INotebookService);
    readonly onDidChangeCapabilities: Event<any>;
    readonly onDidChangeFile: Event<readonly IFileChange[]>;
    watch(_resource: URI, _opts: IWatchOptions): IDisposable;
    stat(_resource: URI): Promise<IStat>;
    mkdir(_resource: URI): Promise<void>;
    readdir(_resource: URI): Promise<[string, FileType][]>;
    delete(_resource: URI, _opts: IFileDeleteOptions): Promise<void>;
    rename(_from: URI, _to: URI, _opts: IFileOverwriteOptions): Promise<void>;
    copy?(_from: URI, _to: URI, _opts: IFileOverwriteOptions): Promise<void>;
    readFile(resource: URI): Promise<Uint8Array>;
    writeFile?(__resource: URI, _content: Uint8Array, _opts: IFileWriteOptions): Promise<void>;
    readFileStream?(__resource: URI, _opts: IFileReadStreamOptions, _token: CancellationToken): ReadableStreamEvents<Uint8Array>;
    open?(__resource: URI, _opts: IFileOpenOptions): Promise<number>;
    close?(_fd: number): Promise<void>;
    read?(_fd: number, _pos: number, _data: Uint8Array, _offset: number, _length: number): Promise<number>;
    write?(_fd: number, _pos: number, _data: Uint8Array, _offset: number, _length: number): Promise<number>;
    cloneFile?(_from: URI, __to: URI): Promise<void>;
}
