import { Event } from '../../../../../base/common/event.js';
import { URI } from '../../../../../base/common/uri.js';
import { IStoredFileWorkingCopyModel, IStoredFileWorkingCopyModelContentChangedEvent, IStoredFileWorkingCopyModelFactory } from '../../common/storedFileWorkingCopy.js';
import { VSBufferReadableStream } from '../../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IFileStatWithMetadata, IWriteFileOptions } from '../../../../../platform/files/common/files.js';
import { SnapshotContext } from '../../common/fileWorkingCopy.js';
export declare class TestStoredFileWorkingCopyModel extends Disposable implements IStoredFileWorkingCopyModel {
    readonly resource: URI;
    contents: string;
    private readonly _onDidChangeContent;
    readonly onDidChangeContent: Event<IStoredFileWorkingCopyModelContentChangedEvent>;
    private readonly _onWillDispose;
    readonly onWillDispose: Event<void>;
    constructor(resource: URI, contents: string);
    fireContentChangeEvent(event: IStoredFileWorkingCopyModelContentChangedEvent): void;
    updateContents(newContents: string): void;
    private throwOnSnapshot;
    setThrowOnSnapshot(): void;
    snapshot(context: SnapshotContext, token: CancellationToken): Promise<VSBufferReadableStream>;
    update(contents: VSBufferReadableStream, token: CancellationToken): Promise<void>;
    private doUpdate;
    versionId: number;
    pushedStackElement: boolean;
    pushStackElement(): void;
    dispose(): void;
}
export declare class TestStoredFileWorkingCopyModelWithCustomSave extends TestStoredFileWorkingCopyModel {
    saveCounter: number;
    throwOnSave: boolean;
    saveOperation: Promise<void> | undefined;
    save(options: IWriteFileOptions, token: CancellationToken): Promise<IFileStatWithMetadata>;
}
export declare class TestStoredFileWorkingCopyModelFactory implements IStoredFileWorkingCopyModelFactory<TestStoredFileWorkingCopyModel> {
    createModel(resource: URI, contents: VSBufferReadableStream, token: CancellationToken): Promise<TestStoredFileWorkingCopyModel>;
}
export declare class TestStoredFileWorkingCopyModelWithCustomSaveFactory implements IStoredFileWorkingCopyModelFactory<TestStoredFileWorkingCopyModelWithCustomSave> {
    createModel(resource: URI, contents: VSBufferReadableStream, token: CancellationToken): Promise<TestStoredFileWorkingCopyModelWithCustomSave>;
}
