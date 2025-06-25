import { BaseActionViewItem } from '../../../base/browser/ui/actionbar/actionViewItems.js';
import { IAction } from '../../../base/common/actions.js';
import { IDisposable } from '../../../base/common/lifecycle.js';
import { IActionWidgetService } from '../../actionWidget/browser/actionWidget.js';
import { IActionWidgetDropdownOptions } from '../../actionWidget/browser/actionWidgetDropdown.js';
import { IContextKeyService } from '../../contextkey/common/contextkey.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
/**
 * Action view item for the custom action widget dropdown widget.
 * Very closely based off of `DropdownMenuActionViewItem`, would be good to have some code re-use in the future
 */
export declare class ActionWidgetDropdownActionViewItem extends BaseActionViewItem {
    private readonly actionWidgetOptions;
    private readonly _actionWidgetService;
    private readonly _keybindingService;
    private readonly _contextKeyService;
    private actionWidgetDropdown;
    private actionItem;
    constructor(action: IAction, actionWidgetOptions: Omit<IActionWidgetDropdownOptions, 'label' | 'labelRenderer'>, _actionWidgetService: IActionWidgetService, _keybindingService: IKeybindingService, _contextKeyService: IContextKeyService);
    render(container: HTMLElement): void;
    protected renderLabel(element: HTMLElement): IDisposable | null;
    protected updateAriaLabel(): void;
    protected setAriaLabelAttributes(element: HTMLElement): void;
    protected getTooltip(): string;
    show(): void;
    protected updateEnabled(): void;
}
