import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { IChatAgentCommand } from '../../common/chatAgents.js';
import { IChatRendererContent } from '../../common/chatViewModel.js';
import { ChatTreeItem } from '../chat.js';
import { IChatContentPart } from './chatContentParts.js';
export declare class ChatAgentCommandContentPart extends Disposable implements IChatContentPart {
    private readonly _hoverService;
    readonly domNode: HTMLElement;
    constructor(cmd: IChatAgentCommand, onClick: () => void, _hoverService: IHoverService);
    hasSameContent(other: IChatRendererContent, followingContent: IChatRendererContent[], element: ChatTreeItem): boolean;
}
