import { LiveElement } from '../../../../../../../base/browser/dom.js';
import { ICommandService } from '../../../../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../../../../platform/keybinding/common/keybinding.js';
import { ObservableCodeEditor } from '../../../../../../browser/observableCodeEditor.js';
import { IInlineEditModel } from '../inlineEditsViewInterface.js';
export declare class GutterIndicatorMenuContent {
    private readonly _model;
    private readonly _close;
    private readonly _editorObs;
    private readonly _contextKeyService;
    private readonly _keybindingService;
    private readonly _commandService;
    private readonly _inlineEditsShowCollapsed;
    constructor(_model: IInlineEditModel, _close: (focusEditor: boolean) => void, _editorObs: ObservableCodeEditor, _contextKeyService: IContextKeyService, _keybindingService: IKeybindingService, _commandService: ICommandService);
    toDisposableLiveElement(): LiveElement;
    private _createHoverContent;
    private _getKeybinding;
}
