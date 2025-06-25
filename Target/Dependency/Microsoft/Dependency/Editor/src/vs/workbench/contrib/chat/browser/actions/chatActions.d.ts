import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IActionViewItemService } from '../../../../../platform/actions/browser/actionViewItemService.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService, ServicesAccessor } from '../../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchContribution } from '../../../../common/contributions.js';
import { IChatEditingSession } from '../../common/chatEditingService.js';
import { IChatEntitlementService } from '../../common/chatEntitlementService.js';
import { IChatRequestViewModel, IChatResponseViewModel } from '../../common/chatViewModel.js';
import { ChatMode } from '../../common/constants.js';
export declare const CHAT_CATEGORY: import("../../../../../nls.js").ILocalizedString;
export declare const ACTION_ID_NEW_CHAT = "workbench.action.chat.newChat";
export declare const ACTION_ID_NEW_EDIT_SESSION = "workbench.action.chat.newEditSession";
export declare const CHAT_OPEN_ACTION_ID = "workbench.action.chat.open";
export declare const CHAT_SETUP_ACTION_ID = "workbench.action.chat.triggerSetup";
export interface IChatViewOpenOptions {
    /**
     * The query for chat.
     */
    query: string;
    /**
     * Whether the query is partial and will await more input from the user.
     */
    isPartialQuery?: boolean;
    /**
     * A list of tools IDs with `canBeReferencedInPrompt` that will be resolved and attached if they exist.
     */
    toolIds?: string[];
    /**
     * Any previous chat requests and responses that should be shown in the chat view.
     */
    previousRequests?: IChatViewOpenRequestEntry[];
    /**
     * Whether a screenshot of the focused window should be taken and attached
     */
    attachScreenshot?: boolean;
    /**
     * The mode to open the chat in.
     */
    mode?: ChatMode;
}
export interface IChatViewOpenRequestEntry {
    request: string;
    response: string;
}
export declare function getOpenChatActionIdForMode(mode: ChatMode): string;
export declare function registerChatActions(): void;
export declare function stringifyItem(item: IChatRequestViewModel | IChatResponseViewModel, includeName?: boolean): string;
export declare class CopilotTitleBarMenuRendering extends Disposable implements IWorkbenchContribution {
    static readonly ID = "workbench.contrib.copilotTitleBarMenuRendering";
    constructor(actionViewItemService: IActionViewItemService, instantiationService: IInstantiationService, chatEntitlementService: IChatEntitlementService);
}
/**
 * Returns whether we can continue clearing/switching chat sessions, false to cancel.
 */
export declare function handleCurrentEditingSession(currentEditingSession: IChatEditingSession, phrase: string | undefined, dialogService: IDialogService): Promise<boolean>;
/**
 * Returns whether we can switch the chat mode, based on whether the user had to agree to clear the session, false to cancel.
 */
export declare function handleModeSwitch(accessor: ServicesAccessor, fromMode: ChatMode, toMode: ChatMode, requestCount: number, editingSession: IChatEditingSession | undefined): Promise<false | {
    needToClearSession: boolean;
}>;
export interface IClearEditingSessionConfirmationOptions {
    titleOverride?: string;
    messageOverride?: string;
}
