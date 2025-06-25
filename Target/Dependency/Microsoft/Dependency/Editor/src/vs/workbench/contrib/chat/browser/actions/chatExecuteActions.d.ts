import { ServicesAccessor } from '../../../../../editor/browser/editorExtensions.js';
import { Action2 } from '../../../../../platform/actions/common/actions.js';
import { IChatMode } from '../../common/chatModes.js';
import { ChatMode } from '../../common/constants.js';
import { IChatWidget } from '../chat.js';
export interface IVoiceChatExecuteActionContext {
    readonly disableTimeout?: boolean;
}
export interface IChatExecuteActionContext {
    widget?: IChatWidget;
    inputValue?: string;
    voice?: IVoiceChatExecuteActionContext;
}
declare abstract class SubmitAction extends Action2 {
    run(accessor: ServicesAccessor, ...args: any[]): void;
}
export declare class ChatSubmitAction extends SubmitAction {
    static readonly ID = "workbench.action.chat.submit";
    constructor();
}
export declare const ToggleAgentModeActionId = "workbench.action.chat.toggleAgentMode";
export interface IToggleChatModeArgs {
    mode: IChatMode | ChatMode;
}
export declare const ToggleRequestPausedActionId = "workbench.action.chat.toggleRequestPaused";
export declare class ToggleRequestPausedAction extends Action2 {
    static readonly ID = "workbench.action.chat.toggleRequestPaused";
    constructor();
    run(accessor: ServicesAccessor, ...args: any[]): void;
}
export declare const ChatOpenModelPickerActionId = "workbench.action.chat.openModelPicker";
export declare const ChangeChatModelActionId = "workbench.action.chat.changeModel";
export declare class ChatEditingSessionSubmitAction extends SubmitAction {
    static readonly ID = "workbench.action.edits.submit";
    constructor();
}
export declare class ChatSubmitWithCodebaseAction extends Action2 {
    static readonly ID = "workbench.action.chat.submitWithCodebase";
    constructor();
    run(accessor: ServicesAccessor, ...args: any[]): void;
}
export declare const CancelChatActionId = "workbench.action.chat.cancel";
export declare class CancelAction extends Action2 {
    static readonly ID = "workbench.action.chat.cancel";
    constructor();
    run(accessor: ServicesAccessor, ...args: any[]): void;
}
export declare function registerChatExecuteActions(): void;
export {};
