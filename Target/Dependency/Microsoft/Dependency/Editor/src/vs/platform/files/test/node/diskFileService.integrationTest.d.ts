import { URI } from '../../../../base/common/uri.js';
import { IFileAtomicReadOptions, FileSystemProviderCapabilities, IStat } from '../../common/files.js';
import { DiskFileSystemProvider } from '../../node/diskFileSystemProvider.js';
export declare class TestDiskFileSystemProvider extends DiskFileSystemProvider {
    totalBytesRead: number;
    private invalidStatSize;
    private smallStatSize;
    private readonly;
    private _testCapabilities;
    get capabilities(): FileSystemProviderCapabilities;
    set capabilities(capabilities: FileSystemProviderCapabilities);
    setInvalidStatSize(enabled: boolean): void;
    setSmallStatSize(enabled: boolean): void;
    setReadonly(readonly: boolean): void;
    stat(resource: URI): Promise<IStat>;
    read(fd: number, pos: number, data: Uint8Array, offset: number, length: number): Promise<number>;
    readFile(resource: URI, options?: IFileAtomicReadOptions): Promise<Uint8Array>;
}
