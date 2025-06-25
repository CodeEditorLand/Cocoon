import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IChatWidget } from '../chat.js';
/**
 * Name of the in-chat slash command associated with this action.
 */
export declare const SAVE_TO_PROMPT_SLASH_COMMAND_NAME = "save";
/**
 * Options for the {@link SaveToPromptAction} action.
 */
interface ISaveToPromptActionOptions {
    /**
     * Chat widget reference to save session of.
     */
    chat: IChatWidget;
}
/**
 * Runs the `Save To Prompt` action with provided options. We export this
 * function instead of {@link SAVE_TO_PROMPT_ACTION_ID} directly to
 * encapsulate/enforce the correct options to be passed to the action.
 */
export declare function runSaveToPromptAction(options: ISaveToPromptActionOptions, commandService: ICommandService): Promise<any>;
/**
 * Helper to register all the `Save Prompt` actions.
 */
export declare function registerSaveToPromptActions(): void;
export {};
