import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, IDisposable } from '../../../../base/common/lifecycle.js';
import { ReadableStreamEvents } from '../../../../base/common/stream.js';
import { URI } from '../../../../base/common/uri.js';
import { FileSystemProviderCapabilities, FileType, IFileChange, IFileDeleteOptions, IFileOverwriteOptions, IFileReadStreamOptions, IFileService, IFileSystemProviderWithFileAtomicReadCapability, IFileSystemProviderWithFileReadStreamCapability, IFileSystemProviderWithFileReadWriteCapability, IFileWriteOptions, IStat, IWatchOptions } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';
export declare class McpResourceFilesystem extends Disposable implements IWorkbenchContribution, IFileSystemProviderWithFileReadWriteCapability, IFileSystemProviderWithFileAtomicReadCapability, IFileSystemProviderWithFileReadStreamCapability {
    private readonly _instantiationService;
    private readonly _fileService;
    /** Defer getting the MCP service since this is a BlockRestore and no need to make it unnecessarily. */
    private readonly _mcpServiceLazy;
    private get _mcpService();
    readonly onDidChangeCapabilities: Event<any>;
    private readonly _onDidChangeFile;
    readonly onDidChangeFile: Event<readonly IFileChange[]>;
    readonly capabilities: FileSystemProviderCapabilities;
    constructor(_instantiationService: IInstantiationService, _fileService: IFileService);
    readFile(resource: URI): Promise<Uint8Array>;
    readFileStream(resource: URI, opts: IFileReadStreamOptions, token: CancellationToken): ReadableStreamEvents<Uint8Array>;
    watch(uri: URI, _opts: IWatchOptions): IDisposable;
    stat(resource: URI): Promise<IStat>;
    readdir(resource: URI): Promise<[string, FileType][]>;
    mkdir(resource: URI): Promise<void>;
    writeFile(resource: URI, content: Uint8Array, opts: IFileWriteOptions): Promise<void>;
    delete(resource: URI, opts: IFileDeleteOptions): Promise<void>;
    rename(from: URI, to: URI, opts: IFileOverwriteOptions): Promise<void>;
    private _readFile;
    private _decodeURI;
    private _readURI;
}
