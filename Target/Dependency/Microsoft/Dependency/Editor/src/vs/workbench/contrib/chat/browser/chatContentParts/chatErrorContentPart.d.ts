import { IMarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { MarkdownRenderer } from '../../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { ChatErrorLevel } from '../../common/chatService.js';
import { IChatRendererContent } from '../../common/chatViewModel.js';
import { IChatContentPart } from './chatContentParts.js';
export declare class ChatErrorContentPart extends Disposable implements IChatContentPart {
    private readonly errorDetails;
    readonly domNode: HTMLElement;
    constructor(kind: ChatErrorLevel, content: IMarkdownString, errorDetails: IChatRendererContent, renderer: MarkdownRenderer);
    hasSameContent(other: IChatRendererContent): boolean;
}
export declare class ChatErrorWidget extends Disposable {
    readonly domNode: HTMLElement;
    constructor(kind: ChatErrorLevel, content: IMarkdownString, renderer: MarkdownRenderer);
}
