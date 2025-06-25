import { Disposable } from '../../../base/common/lifecycle.js';
import { IChatStatusItemService } from '../../contrib/chat/browser/chatStatusItemService.js';
import { IExtHostContext } from '../../services/extensions/common/extHostCustomers.js';
import { ChatStatusItemDto, MainThreadChatStatusShape } from '../common/extHost.protocol.js';
export declare class MainThreadChatStatus extends Disposable implements MainThreadChatStatusShape {
    private readonly _chatStatusItemService;
    constructor(_extHostContext: IExtHostContext, _chatStatusItemService: IChatStatusItemService);
    $setEntry(id: string, entry: ChatStatusItemDto): void;
    $disposeEntry(id: string): void;
}
