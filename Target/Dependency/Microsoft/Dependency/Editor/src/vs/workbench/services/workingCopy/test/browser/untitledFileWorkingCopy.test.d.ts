import { VSBufferReadableStream } from '../../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { SnapshotContext } from '../../common/fileWorkingCopy.js';
import { IUntitledFileWorkingCopyModel, IUntitledFileWorkingCopyModelContentChangedEvent, IUntitledFileWorkingCopyModelFactory } from '../../common/untitledFileWorkingCopy.js';
export declare class TestUntitledFileWorkingCopyModel extends Disposable implements IUntitledFileWorkingCopyModel {
    readonly resource: URI;
    contents: string;
    private readonly _onDidChangeContent;
    readonly onDidChangeContent: import("../../../../workbench.web.main.internal.js").Event<IUntitledFileWorkingCopyModelContentChangedEvent>;
    private readonly _onWillDispose;
    readonly onWillDispose: import("../../../../workbench.web.main.internal.js").Event<void>;
    constructor(resource: URI, contents: string);
    fireContentChangeEvent(event: IUntitledFileWorkingCopyModelContentChangedEvent): void;
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
export declare class TestUntitledFileWorkingCopyModelFactory implements IUntitledFileWorkingCopyModelFactory<TestUntitledFileWorkingCopyModel> {
    createModel(resource: URI, contents: VSBufferReadableStream, token: CancellationToken): Promise<TestUntitledFileWorkingCopyModel>;
}
