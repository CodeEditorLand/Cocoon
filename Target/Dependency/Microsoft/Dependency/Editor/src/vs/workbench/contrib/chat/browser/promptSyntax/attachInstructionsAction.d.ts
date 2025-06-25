import { IChatWidget } from '../chat.js';
import { URI } from '../../../../../base/common/uri.js';
import { IPromptsService } from '../../common/promptSyntax/service/promptsService.js';
import { IChatContextPickerItem, IChatContextPicker } from '../chatContextPickService.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
/**
 * Options for the {@link AttachInstructionsAction} action.
 */
export interface IAttachInstructionsActionOptions {
    /**
     * Target chat widget reference to attach the instruction to. If the reference is
     * provided, the command will attach the instruction as attachment of the widget.
     * Otherwise, the command will re-use an existing one.
     */
    readonly widget?: IChatWidget;
    /**
     * Instruction resource `URI` to attach to the chat input, if any.
     * If provided the resource will be pre-selected in the prompt picker dialog,
     * otherwise the dialog will show the prompts list without any pre-selection.
     */
    readonly resource?: URI;
    /**
     * Whether to skip the instructions files selection dialog.
     *
     * Note! if this option is set to `true`, the {@link resource}
     * option `must be defined`.
     */
    readonly skipSelectionDialog?: boolean;
}
/**
 * Helper to register the `Attach Prompt` action.
 */
export declare function registerAttachPromptActions(): void;
export declare class ChatInstructionsPickerPick implements IChatContextPickerItem {
    private readonly promptsService;
    private readonly labelService;
    private readonly configurationService;
    readonly type = "pickerPick";
    readonly label: string;
    readonly icon: import("../../../../../base/common/themables.js").ThemeIcon;
    readonly commandId = "workbench.action.chat.attach.instructions";
    constructor(promptsService: IPromptsService, labelService: ILabelService, configurationService: IConfigurationService);
    isEnabled(widget: IChatWidget): Promise<boolean> | boolean;
    asPicker(): IChatContextPicker;
}
