import { Disposable } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { EditorInputCapabilities, IEditorIdentifier, IEditorSerializer, IUntypedEditorInput } from '../../../common/editor.js';
import { EditorInput, IEditorCloseHandler } from '../../../common/editor/editorInput.js';
import type { IChatEditorOptions } from './chatEditor.js';
import { IChatModel } from '../common/chatModel.js';
import { IChatService } from '../common/chatService.js';
import { ConfirmResult, IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IChatEditingSession } from '../common/chatEditingService.js';
import { IClearEditingSessionConfirmationOptions } from './actions/chatActions.js';
export declare class ChatEditorInput extends EditorInput implements IEditorCloseHandler {
    readonly resource: URI;
    readonly options: IChatEditorOptions;
    private readonly chatService;
    private readonly dialogService;
    static readonly countsInUse: Set<number>;
    static readonly TypeID: string;
    static readonly EditorID: string;
    private readonly inputCount;
    sessionId: string | undefined;
    private model;
    static getNewEditorUri(): URI;
    static getNextCount(): number;
    constructor(resource: URI, options: IChatEditorOptions, chatService: IChatService, dialogService: IDialogService);
    closeHandler: this;
    showConfirm(): boolean;
    confirm(editors: ReadonlyArray<IEditorIdentifier>): Promise<ConfirmResult>;
    get editorId(): string | undefined;
    get capabilities(): EditorInputCapabilities;
    matches(otherInput: EditorInput | IUntypedEditorInput): boolean;
    get typeId(): string;
    getName(): string;
    getIcon(): ThemeIcon;
    resolve(): Promise<ChatEditorModel | null>;
    dispose(): void;
}
export declare class ChatEditorModel extends Disposable {
    readonly model: IChatModel;
    private _onWillDispose;
    readonly onWillDispose: import("../../../workbench.web.main.internal.js").Event<void>;
    private _isDisposed;
    private _isResolved;
    constructor(model: IChatModel);
    resolve(): Promise<void>;
    isResolved(): boolean;
    isDisposed(): boolean;
    dispose(): void;
}
export declare namespace ChatUri {
    const scheme = "vscode-chat-editor";
    function generate(handle: number): URI;
    function parse(resource: URI): {
        handle: number;
    } | undefined;
}
export declare class ChatEditorInputSerializer implements IEditorSerializer {
    canSerialize(input: EditorInput): input is ChatEditorInput & {
        readonly sessionId: string;
    };
    serialize(input: EditorInput): string | undefined;
    deserialize(instantiationService: IInstantiationService, serializedEditor: string): EditorInput | undefined;
}
export declare function showClearEditingSessionConfirmation(editingSession: IChatEditingSession, dialogService: IDialogService, options?: IClearEditingSessionConfirmationOptions): Promise<boolean>;
export declare function shouldShowClearEditingSessionConfirmation(editingSession: IChatEditingSession): boolean;
