import { CancellationToken } from '../../../../base/common/cancellation.js';
import { URI } from '../../../../base/common/uri.js';
import { ResourceEdit } from '../../../../editor/browser/services/bulkEditService.js';
import { ICustomEdit, WorkspaceEditMetadata } from '../../../../editor/common/languages.js';
import { IProgress } from '../../../../platform/progress/common/progress.js';
import { IUndoRedoService, UndoRedoGroup, UndoRedoSource } from '../../../../platform/undoRedo/common/undoRedo.js';
export declare class ResourceAttachmentEdit extends ResourceEdit implements ICustomEdit {
    readonly resource: URI;
    readonly undo: () => Promise<void> | void;
    readonly redo: () => Promise<void> | void;
    static is(candidate: any): candidate is ICustomEdit;
    static lift(edit: ICustomEdit): ResourceAttachmentEdit;
    constructor(resource: URI, undo: () => Promise<void> | void, redo: () => Promise<void> | void, metadata?: WorkspaceEditMetadata);
}
export declare class OpaqueEdits {
    private readonly _undoRedoGroup;
    private readonly _undoRedoSource;
    private readonly _progress;
    private readonly _token;
    private readonly _edits;
    private readonly _undoRedoService;
    constructor(_undoRedoGroup: UndoRedoGroup, _undoRedoSource: UndoRedoSource | undefined, _progress: IProgress<void>, _token: CancellationToken, _edits: ResourceAttachmentEdit[], _undoRedoService: IUndoRedoService);
    apply(): Promise<readonly URI[]>;
}
