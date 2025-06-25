import { Disposable } from '../../../../base/common/lifecycle.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { IExtensionFeaturesManagementService } from '../../../services/extensionManagement/common/extensionFeatures.js';
export declare const ILanguageModelStatsService: import("../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<ILanguageModelStatsService>;
export interface ILanguageModelStatsService {
    readonly _serviceBrand: undefined;
    update(model: string, extensionId: ExtensionIdentifier, agent: string | undefined, tokenCount: number | undefined): Promise<void>;
}
export declare class LanguageModelStatsService extends Disposable implements ILanguageModelStatsService {
    private readonly extensionFeaturesManagementService;
    _serviceBrand: undefined;
    constructor(extensionFeaturesManagementService: IExtensionFeaturesManagementService, storageService: IStorageService);
    update(model: string, extensionId: ExtensionIdentifier, agent: string | undefined, tokenCount: number | undefined): Promise<void>;
}
export declare const CopilotUsageExtensionFeatureId = "copilot";
