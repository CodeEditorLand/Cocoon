import { IJSONSchema } from '../../../../../base/common/jsonSchema.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IWorkbenchContribution } from '../../../../common/contributions.js';
import { ILanguageModelToolsService } from '../languageModelToolsService.js';
export interface IRawToolContribution {
    name: string;
    displayName: string;
    modelDescription: string;
    toolReferenceName?: string;
    icon?: string | {
        light: string;
        dark: string;
    };
    when?: string;
    tags?: string[];
    userDescription?: string;
    inputSchema?: IJSONSchema;
    canBeReferencedInPrompt?: boolean;
}
export interface IRawToolSetContribution {
    name: string;
    /**
     * @deprecated
     */
    referenceName?: string;
    description: string;
    icon?: string;
    tools: string[];
}
export declare class LanguageModelToolsExtensionPointHandler implements IWorkbenchContribution {
    static readonly ID = "workbench.contrib.toolsExtensionPointHandler";
    private _registrationDisposables;
    constructor(productService: IProductService, languageModelToolsService: ILanguageModelToolsService);
}
