import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchContribution } from '../../../../common/contributions.js';
import { ILanguageModelToolsService } from '../../common/languageModelToolsService.js';
export declare class BuiltinToolsContribution extends Disposable implements IWorkbenchContribution {
    static readonly ID = "chat.builtinTools";
    constructor(toolsService: ILanguageModelToolsService, instantiationService: IInstantiationService);
}
export declare const InternalFetchWebPageToolId = "vscode_fetchWebPage_internal";
