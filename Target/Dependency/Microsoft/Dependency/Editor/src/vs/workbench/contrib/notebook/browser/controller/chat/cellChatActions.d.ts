import { ServicesAccessor } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ICodeEditor } from '../../../../../../editor/browser/editorBrowser.js';
import { EditorAction2 } from '../../../../../../editor/browser/editorExtensions.js';
export declare class AcceptChangesAndRun extends EditorAction2 {
    constructor();
    runEditorCommand(accessor: ServicesAccessor, codeEditor: ICodeEditor): Promise<void> | undefined;
}
