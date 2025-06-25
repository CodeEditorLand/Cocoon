import { IMarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable, IDisposable } from '../../../../../base/common/lifecycle.js';
import { MarkdownRenderer } from '../../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ChatErrorLevel, IChatResponseErrorDetailsConfirmationButton, IChatService } from '../../common/chatService.js';
import { IChatErrorDetailsPart, IChatRendererContent } from '../../common/chatViewModel.js';
import { IChatWidgetService } from '../chat.js';
import { IChatContentPart, IChatContentPartRenderContext } from './chatContentParts.js';
export declare class ChatErrorConfirmationContentPart extends Disposable implements IChatContentPart {
    private readonly errorDetails;
    readonly domNode: HTMLElement;
    private readonly _onDidChangeHeight;
    readonly onDidChangeHeight: import("../../../../workbench.web.main.internal.js").Event<void>;
    constructor(kind: ChatErrorLevel, content: IMarkdownString, errorDetails: IChatErrorDetailsPart, confirmationButtons: IChatResponseErrorDetailsConfirmationButton[], renderer: MarkdownRenderer, context: IChatContentPartRenderContext, instantiationService: IInstantiationService, chatWidgetService: IChatWidgetService, chatService: IChatService);
    hasSameContent(other: IChatRendererContent): boolean;
    addDisposable(disposable: IDisposable): void;
}
