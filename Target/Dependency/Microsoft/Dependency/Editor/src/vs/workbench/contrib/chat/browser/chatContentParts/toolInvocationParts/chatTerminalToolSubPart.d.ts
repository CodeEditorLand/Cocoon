import { MarkdownRenderer } from '../../../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { IChatTerminalToolInvocationData, IChatToolInvocation } from '../../../common/chatService.js';
import { IChatCodeBlockInfo, IChatWidgetService } from '../../chat.js';
import { IChatContentPartRenderContext } from '../chatContentParts.js';
import { EditorPool } from '../chatMarkdownContentPart.js';
import { BaseChatToolInvocationSubPart } from './chatToolInvocationSubPart.js';
export declare class TerminalConfirmationWidgetSubPart extends BaseChatToolInvocationSubPart {
    private readonly context;
    private readonly renderer;
    private readonly editorPool;
    private readonly currentWidthDelegate;
    private readonly codeBlockStartIndex;
    private readonly instantiationService;
    private readonly modelService;
    private readonly languageService;
    private readonly contextKeyService;
    private readonly chatWidgetService;
    readonly domNode: HTMLElement;
    readonly codeblocks: IChatCodeBlockInfo[];
    constructor(toolInvocation: IChatToolInvocation, terminalData: IChatTerminalToolInvocationData, context: IChatContentPartRenderContext, renderer: MarkdownRenderer, editorPool: EditorPool, currentWidthDelegate: () => number, codeBlockStartIndex: number, instantiationService: IInstantiationService, keybindingService: IKeybindingService, modelService: IModelService, languageService: ILanguageService, contextKeyService: IContextKeyService, chatWidgetService: IChatWidgetService);
}
