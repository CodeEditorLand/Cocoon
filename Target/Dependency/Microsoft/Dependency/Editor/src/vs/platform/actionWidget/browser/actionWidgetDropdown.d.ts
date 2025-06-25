import { IActionWidgetService } from './actionWidget.js';
import { IAction } from '../../../base/common/actions.js';
import { BaseDropdown, IActionProvider, IBaseDropdownOptions } from '../../../base/browser/ui/dropdown/dropdown.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
export interface IActionWidgetDropdownAction extends IAction {
    category?: {
        label: string;
        order: number;
    };
    description?: string;
}
export interface IActionWidgetDropdownActionProvider {
    getActions(): IActionWidgetDropdownAction[];
}
export interface IActionWidgetDropdownOptions extends IBaseDropdownOptions {
    readonly actions?: IActionWidgetDropdownAction[];
    readonly actionProvider?: IActionWidgetDropdownActionProvider;
    readonly actionBarActions?: IAction[];
    readonly actionBarActionProvider?: IActionProvider;
    readonly showItemKeybindings?: boolean;
}
/**
 * Action widget dropdown is a dropdown that uses the action widget under the hood to simulate a native dropdown menu
 * The benefits of this include non native features such as headers, descriptions, icons, and button bar
 */
export declare class ActionWidgetDropdown extends BaseDropdown {
    private readonly _options;
    private readonly actionWidgetService;
    private readonly keybindingService;
    constructor(container: HTMLElement, _options: IActionWidgetDropdownOptions, actionWidgetService: IActionWidgetService, keybindingService: IKeybindingService);
    show(): void;
}
