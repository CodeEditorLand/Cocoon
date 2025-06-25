import { IDialogOptions } from '../../../base/browser/ui/dialog/dialog.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
import { ILayoutService } from '../../layout/browser/layoutService.js';
export declare function createWorkbenchDialogOptions(options: Partial<IDialogOptions>, keybindingService: IKeybindingService, layoutService: ILayoutService, allowableCommands?: string[]): IDialogOptions;
