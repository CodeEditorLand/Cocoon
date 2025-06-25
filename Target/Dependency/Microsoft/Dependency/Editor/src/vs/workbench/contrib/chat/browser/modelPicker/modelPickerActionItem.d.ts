import { IAction } from '../../../../../base/common/actions.js';
import { Event } from '../../../../../base/common/event.js';
import { ILanguageModelChatMetadataAndIdentifier } from '../../common/languageModels.js';
import { IDisposable } from '../../../../../base/common/lifecycle.js';
import { ActionWidgetDropdownActionViewItem } from '../../../../../platform/actions/browser/actionWidgetDropdownActionViewItem.js';
import { IActionWidgetService } from '../../../../../platform/actionWidget/browser/actionWidget.js';
import { IMenuService } from '../../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IChatEntitlementService } from '../../common/chatEntitlementService.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
export interface IModelPickerDelegate {
    readonly onDidChangeModel: Event<ILanguageModelChatMetadataAndIdentifier>;
    getCurrentModel(): ILanguageModelChatMetadataAndIdentifier | undefined;
    setModel(model: ILanguageModelChatMetadataAndIdentifier): void;
    getModels(): ILanguageModelChatMetadataAndIdentifier[];
}
/**
 * Action view item for selecting a language model in the chat interface.
 */
export declare class ModelPickerActionItem extends ActionWidgetDropdownActionViewItem {
    private currentModel;
    constructor(action: IAction, currentModel: ILanguageModelChatMetadataAndIdentifier, delegate: IModelPickerDelegate, actionWidgetService: IActionWidgetService, menuService: IMenuService, contextKeyService: IContextKeyService, commandService: ICommandService, chatEntitlementService: IChatEntitlementService, keybindingService: IKeybindingService);
    protected renderLabel(element: HTMLElement): IDisposable | null;
    render(container: HTMLElement): void;
}
