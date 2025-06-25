import { Disposable } from '../../../../base/common/lifecycle.js';
import { ICodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { IEditorContribution } from '../../../../editor/common/editorCommon.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { EditorAction2, ServicesAccessor } from '../../../../editor/browser/editorExtensions.js';
import { IPosition } from '../../../../editor/common/core/position.js';
import { URI } from '../../../../base/common/uri.js';
import './media/inlineChat.css';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IChatAgentService } from '../../chat/common/chatAgents.js';
import { IMarkerDecorationsService } from '../../../../editor/common/services/markerDecorations.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
export declare const CTX_INLINE_CHAT_SHOWING_HINT: RawContextKey<boolean>;
export declare class InlineChatExpandLineAction extends EditorAction2 {
    constructor();
    runEditorCommand(_accessor: ServicesAccessor, editor: ICodeEditor): Promise<void>;
}
export declare class ShowInlineChatHintAction extends EditorAction2 {
    constructor();
    runEditorCommand(_accessor: ServicesAccessor, editor: ICodeEditor, ...args: [uri: URI, position: IPosition, ...rest: any[]]): Promise<void>;
}
export declare class InlineChatHintsController extends Disposable implements IEditorContribution {
    private readonly _contextMenuService;
    private readonly _configurationService;
    static readonly ID = "editor.contrib.inlineChatHints";
    static get(editor: ICodeEditor): InlineChatHintsController | null;
    private readonly _editor;
    private readonly _ctxShowingHint;
    private readonly _visibilityObs;
    constructor(editor: ICodeEditor, contextKeyService: IContextKeyService, commandService: ICommandService, keybindingService: IKeybindingService, chatAgentService: IChatAgentService, markerDecorationService: IMarkerDecorationsService, _contextMenuService: IContextMenuService, _configurationService: IConfigurationService);
    private _showContextMenu;
    show(): void;
    hide(): void;
}
export declare class HideInlineChatHintAction extends EditorAction2 {
    constructor();
    runEditorCommand(_accessor: ServicesAccessor, editor: ICodeEditor): Promise<void>;
}
