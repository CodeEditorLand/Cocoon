import { IContextMenuProvider } from '../../../base/browser/contextmenu.js';
import { IActionProvider } from '../../../base/browser/ui/dropdown/dropdown.js';
import { DropdownMenuActionViewItem, IDropdownMenuActionViewItemOptions } from '../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import { IAction } from '../../../base/common/actions.js';
import { IContextKeyService } from '../../contextkey/common/contextkey.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
export declare class DropdownMenuActionViewItemWithKeybinding extends DropdownMenuActionViewItem {
    private readonly keybindingService;
    private readonly contextKeyService;
    constructor(action: IAction, menuActionsOrProvider: readonly IAction[] | IActionProvider, contextMenuProvider: IContextMenuProvider, options: IDropdownMenuActionViewItemOptions | undefined, keybindingService: IKeybindingService, contextKeyService: IContextKeyService);
    protected getTooltip(): string;
}
