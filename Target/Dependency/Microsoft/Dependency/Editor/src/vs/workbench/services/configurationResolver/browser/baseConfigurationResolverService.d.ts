import { IStringDictionary } from '../../../../base/common/collections.js';
import { IProcessEnvironment } from '../../../../base/common/platform.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ConfigurationTarget, IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IWorkspaceContextService, IWorkspaceFolderData } from '../../../../platform/workspace/common/workspace.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { IPathService } from '../../path/common/pathService.js';
import { AbstractVariableResolverService } from '../common/variableResolver.js';
export declare abstract class BaseConfigurationResolverService extends AbstractVariableResolverService {
    private readonly configurationService;
    private readonly commandService;
    private readonly quickInputService;
    private readonly labelService;
    private readonly pathService;
    private readonly storageService;
    static readonly INPUT_OR_COMMAND_VARIABLES_PATTERN: RegExp;
    private userInputAccessQueue;
    constructor(context: {
        getAppRoot: () => string | undefined;
        getExecPath: () => string | undefined;
    }, envVariablesPromise: Promise<IProcessEnvironment>, editorService: IEditorService, configurationService: IConfigurationService, commandService: ICommandService, workspaceContextService: IWorkspaceContextService, quickInputService: IQuickInputService, labelService: ILabelService, pathService: IPathService, extensionService: IExtensionService, storageService: IStorageService);
    resolveWithInteractionReplace(folder: IWorkspaceFolderData | undefined, config: unknown, section?: string, variables?: IStringDictionary<string>, target?: ConfigurationTarget): Promise<any>;
    resolveWithInteraction(folder: IWorkspaceFolderData | undefined, config: unknown, section?: string, variableToCommandMap?: IStringDictionary<string>, target?: ConfigurationTarget): Promise<Map<string, string> | undefined>;
    private resolveInputs;
    private readInputLru;
    private storeInputLru;
    private showUserInput;
}
