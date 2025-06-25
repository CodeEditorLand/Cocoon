import { MarkdownRenderer } from '../../../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IChatTerminalToolInvocationData, IChatToolInvocation, IChatToolInvocationSerialized } from '../../../common/chatService.js';
import { CodeBlockModelCollection } from '../../../common/codeBlockModelCollection.js';
import { IChatCodeBlockInfo } from '../../chat.js';
import { IChatContentPartRenderContext } from '../chatContentParts.js';
import { EditorPool } from '../chatMarkdownContentPart.js';
import { BaseChatToolInvocationSubPart } from './chatToolInvocationSubPart.js';
export declare class ChatTerminalMarkdownProgressPart extends BaseChatToolInvocationSubPart {
    readonly domNode: HTMLElement;
    private markdownPart;
    get codeblocks(): IChatCodeBlockInfo[];
    constructor(toolInvocation: IChatToolInvocation | IChatToolInvocationSerialized, terminalData: IChatTerminalToolInvocationData, context: IChatContentPartRenderContext, renderer: MarkdownRenderer, editorPool: EditorPool, currentWidthDelegate: () => number, codeBlockStartIndex: number, codeBlockModelCollection: CodeBlockModelCollection, instantiationService: IInstantiationService);
}
