import { CancellationToken } from '../../../../base/common/cancellation.js';
import { CountTokensCallback, IPreparedToolInvocation, IToolData, IToolImpl, IToolInvocation, IToolResult, ToolProgress } from '../../chat/common/languageModelToolsService.js';
import { IExtensionsWorkbenchService } from './extensions.js';
export declare const InstallExtensionsToolId = "vscode_installExtensions";
export declare const InstallExtensionsToolData: IToolData;
type InputParams = {
    ids: string[];
};
export declare class InstallExtensionsTool implements IToolImpl {
    private readonly extensionsWorkbenchService;
    constructor(extensionsWorkbenchService: IExtensionsWorkbenchService);
    prepareToolInvocation(parameters: InputParams, token: CancellationToken): Promise<IPreparedToolInvocation | undefined>;
    invoke(invocation: IToolInvocation, _countTokens: CountTokensCallback, _progress: ToolProgress, token: CancellationToken): Promise<IToolResult>;
}
export {};
