import { ICodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { EditorAction2 } from '../../../../editor/browser/editorExtensions.js';
export declare class HoldToSpeak extends EditorAction2 {
    constructor();
    runEditorCommand(accessor: ServicesAccessor, editor: ICodeEditor, ..._args: any[]): void;
}
