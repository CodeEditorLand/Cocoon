import { Disposable } from '../../../../../base/common/lifecycle.js';
import { Action2 } from '../../../../../platform/actions/common/actions.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { ServicesAccessor } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IWorkbenchContribution } from '../../../../common/contributions.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { IUserDataProfileService } from '../../../../services/userDataProfile/common/userDataProfile.js';
import { ILanguageModelToolsService } from '../../common/languageModelToolsService.js';
export declare class UserToolSetsContributions extends Disposable implements IWorkbenchContribution {
    private readonly _languageModelToolsService;
    private readonly _userDataProfileService;
    private readonly _fileService;
    private readonly _logService;
    static readonly ID = "chat.userToolSets";
    constructor(extensionService: IExtensionService, lifecycleService: ILifecycleService, _languageModelToolsService: ILanguageModelToolsService, _userDataProfileService: IUserDataProfileService, _fileService: IFileService, _logService: ILogService);
    private _initToolSets;
}
export declare class ConfigureToolSets extends Action2 {
    static readonly ID = "chat.configureToolSets";
    constructor();
    run(accessor: ServicesAccessor): Promise<void>;
}
