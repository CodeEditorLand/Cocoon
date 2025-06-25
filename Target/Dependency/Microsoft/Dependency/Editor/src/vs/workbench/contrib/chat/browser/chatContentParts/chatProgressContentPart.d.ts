import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { MarkdownRenderer } from '../../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IChatProgressMessage, IChatTask, IChatTaskSerialized } from '../../common/chatService.js';
import { IChatRendererContent, IChatWorkingProgress } from '../../common/chatViewModel.js';
import { ChatTreeItem } from '../chat.js';
import { IChatContentPart, IChatContentPartRenderContext } from './chatContentParts.js';
import { IChatMarkdownAnchorService } from './chatMarkdownAnchorService.js';
export declare class ChatProgressContentPart extends Disposable implements IChatContentPart {
    private readonly instantiationService;
    private readonly chatMarkdownAnchorService;
    readonly domNode: HTMLElement;
    private readonly showSpinner;
    private readonly isHidden;
    constructor(progress: IChatProgressMessage | IChatTask | IChatTaskSerialized, renderer: MarkdownRenderer, context: IChatContentPartRenderContext, forceShowSpinner: boolean | undefined, forceShowMessage: boolean | undefined, icon: ThemeIcon | undefined, instantiationService: IInstantiationService, chatMarkdownAnchorService: IChatMarkdownAnchorService);
    hasSameContent(other: IChatRendererContent, followingContent: IChatRendererContent[], element: ChatTreeItem): boolean;
}
export declare class ChatWorkingProgressContentPart extends ChatProgressContentPart implements IChatContentPart {
    private readonly workingProgress;
    constructor(workingProgress: IChatWorkingProgress, renderer: MarkdownRenderer, context: IChatContentPartRenderContext, instantiationService: IInstantiationService, chatMarkdownAnchorService: IChatMarkdownAnchorService);
    hasSameContent(other: IChatRendererContent, followingContent: IChatRendererContent[], element: ChatTreeItem): boolean;
}
export declare class ChatCustomProgressPart {
    readonly domNode: HTMLElement;
    constructor(messageElement: HTMLElement, icon: ThemeIcon);
}
