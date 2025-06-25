import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IActionViewItemService } from '../../../../../platform/actions/browser/actionViewItemService.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IWorkbenchContribution } from '../../../../common/contributions.js';
import { IChatResponseViewModel } from '../../common/chatViewModel.js';
import { ICodeBlockActionContext, ICodeCompareBlockActionContext } from '../codeBlockPart.js';
export interface IChatCodeBlockActionContext extends ICodeBlockActionContext {
    element: IChatResponseViewModel;
}
export declare function isCodeBlockActionContext(thing: unknown): thing is ICodeBlockActionContext;
export declare function isCodeCompareBlockActionContext(thing: unknown): thing is ICodeCompareBlockActionContext;
export declare class CodeBlockActionRendering extends Disposable implements IWorkbenchContribution {
    static readonly ID = "chat.codeBlockActionRendering";
    constructor(actionViewItemService: IActionViewItemService, instantiationService: IInstantiationService, labelService: ILabelService);
}
export declare function registerChatCodeBlockActions(): void;
export declare function registerChatCodeCompareBlockActions(): void;
