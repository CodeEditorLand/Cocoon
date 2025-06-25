import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { EditorInputCapabilities, IUntypedEditorInput } from '../../../common/editor.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
export declare class ProcessExplorerEditorInput extends EditorInput {
    static readonly ID = "workbench.editor.processExplorer";
    static readonly RESOURCE: URI;
    private static _instance;
    static get instance(): ProcessExplorerEditorInput;
    get typeId(): string;
    get editorId(): string | undefined;
    get capabilities(): EditorInputCapabilities;
    readonly resource: URI;
    getName(): string;
    getIcon(): ThemeIcon;
    matches(other: EditorInput | IUntypedEditorInput): boolean;
}
