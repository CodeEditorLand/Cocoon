import { IDisposable } from '../../../../base/common/lifecycle.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService, ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IChatAgentCommand, IChatAgentData, IChatAgentService } from '../common/chatAgents.js';
import { IParsedChatRequest } from '../common/chatParserTypes.js';
import { IChatMarkdownContent, IChatService } from '../common/chatService.js';
import { ILanguageModelToolsService } from '../common/languageModelToolsService.js';
import { IChatWidgetService } from './chat.js';
import { IChatMarkdownAnchorService } from './chatContentParts/chatMarkdownAnchorService.js';
import './media/chatInlineAnchorWidget.css';
export declare function agentToMarkdown(agent: IChatAgentData, isClickable: boolean, accessor: ServicesAccessor): string;
export declare function agentSlashCommandToMarkdown(agent: IChatAgentData, command: IChatAgentCommand): string;
export interface IDecorationWidgetArgs {
    title?: string;
}
export declare class ChatMarkdownDecorationsRenderer {
    private readonly keybindingService;
    private readonly logService;
    private readonly chatAgentService;
    private readonly instantiationService;
    private readonly hoverService;
    private readonly chatService;
    private readonly chatWidgetService;
    private readonly commandService;
    private readonly labelService;
    private readonly toolsService;
    private readonly chatMarkdownAnchorService;
    constructor(keybindingService: IKeybindingService, logService: ILogService, chatAgentService: IChatAgentService, instantiationService: IInstantiationService, hoverService: IHoverService, chatService: IChatService, chatWidgetService: IChatWidgetService, commandService: ICommandService, labelService: ILabelService, toolsService: ILanguageModelToolsService, chatMarkdownAnchorService: IChatMarkdownAnchorService);
    convertParsedRequestToMarkdown(parsedRequest: IParsedChatRequest): string;
    private genericDecorationToMarkdown;
    walkTreeAndAnnotateReferenceLinks(content: IChatMarkdownContent, element: HTMLElement): IDisposable;
    private renderAgentWidget;
    private renderSlashCommandWidget;
    private renderFileWidget;
    private renderResourceWidget;
    private injectKeybindingHint;
}
