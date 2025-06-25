import { Disposable, IDisposable } from '../../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IChatProgressRenderableResponseContent } from '../../common/chatModel.js';
import { IChatElicitationRequest } from '../../common/chatService.js';
import { IChatContentPart, IChatContentPartRenderContext } from './chatContentParts.js';
export declare class ChatElicitationContentPart extends Disposable implements IChatContentPart {
    private readonly instantiationService;
    readonly domNode: HTMLElement;
    private readonly _onDidChangeHeight;
    readonly onDidChangeHeight: import("../../../../workbench.web.main.internal.js").Event<void>;
    constructor(elicitation: IChatElicitationRequest, context: IChatContentPartRenderContext, instantiationService: IInstantiationService);
    private getMessageToRender;
    hasSameContent(other: IChatProgressRenderableResponseContent): boolean;
    addDisposable(disposable: IDisposable): void;
}
