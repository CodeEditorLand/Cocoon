import { URI } from '../../../../../base/common/uri.js';
import { NativeWorkbenchEnvironmentService } from '../../../environment/electron-browser/environmentService.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { NativeWorkingCopyBackupService } from '../../electron-browser/workingCopyBackupService.js';
import { VSBufferReadable, VSBufferReadableStream } from '../../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { IWorkingCopyIdentifier } from '../../common/workingCopy.js';
export declare class TestNativeWorkbenchEnvironmentService extends NativeWorkbenchEnvironmentService {
    constructor(testDir: URI, backupPath: URI);
}
export declare class NodeTestWorkingCopyBackupService extends NativeWorkingCopyBackupService {
    private backupResourceJoiners;
    private discardBackupJoiners;
    discardedBackups: IWorkingCopyIdentifier[];
    discardedAllBackups: boolean;
    private pendingBackupsArr;
    readonly _fileService: IFileService;
    constructor(testDir: URI, workspaceBackupPath: URI);
    testGetFileService(): IFileService;
    waitForAllBackups(): Promise<void>;
    joinBackupResource(): Promise<void>;
    backup(identifier: IWorkingCopyIdentifier, content?: VSBufferReadableStream | VSBufferReadable, versionId?: number, meta?: any, token?: CancellationToken): Promise<void>;
    joinDiscardBackup(): Promise<void>;
    discardBackup(identifier: IWorkingCopyIdentifier): Promise<void>;
    discardBackups(filter?: {
        except: IWorkingCopyIdentifier[];
    }): Promise<void>;
    getBackupContents(identifier: IWorkingCopyIdentifier): Promise<string>;
}
