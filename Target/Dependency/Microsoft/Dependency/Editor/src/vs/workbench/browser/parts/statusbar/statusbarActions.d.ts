import { Action } from '../../../../base/common/actions.js';
import { StatusbarViewModel } from './statusbarModel.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
export declare class ToggleStatusbarEntryVisibilityAction extends Action {
    private model;
    constructor(id: string, label: string, model: StatusbarViewModel);
    run(): Promise<void>;
}
export declare class HideStatusbarEntryAction extends Action {
    private model;
    constructor(id: string, name: string, model: StatusbarViewModel);
    run(): Promise<void>;
}
export declare class ManageExtensionAction extends Action {
    private readonly extensionId;
    private readonly commandService;
    constructor(extensionId: string, commandService: ICommandService);
    run(): Promise<void>;
}
