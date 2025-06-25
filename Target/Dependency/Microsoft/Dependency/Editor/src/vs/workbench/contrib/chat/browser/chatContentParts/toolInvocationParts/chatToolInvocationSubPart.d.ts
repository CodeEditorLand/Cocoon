import { Emitter } from '../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { IChatToolInvocation, IChatToolInvocationSerialized } from '../../../common/chatService.js';
import { IChatCodeBlockInfo } from '../../chat.js';
export declare abstract class BaseChatToolInvocationSubPart extends Disposable {
    protected static idPool: number;
    abstract readonly domNode: HTMLElement;
    protected _onNeedsRerender: Emitter<void>;
    readonly onNeedsRerender: import("../../../../../workbench.web.main.internal.js").Event<void>;
    protected _onDidChangeHeight: Emitter<void>;
    readonly onDidChangeHeight: import("../../../../../workbench.web.main.internal.js").Event<void>;
    abstract codeblocks: IChatCodeBlockInfo[];
    readonly codeblocksPartId: string;
    constructor(toolInvocation: IChatToolInvocation | IChatToolInvocationSerialized);
}
