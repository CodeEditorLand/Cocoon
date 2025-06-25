import { Disposable } from '../../../base/common/lifecycle.js';
import { IGalleryExtension, IAllowedExtensionsService, AllowedExtensionsConfigValueType } from './extensionManagement.js';
import { IExtension, TargetPlatform } from '../../extensions/common/extensions.js';
import { IProductService } from '../../product/common/productService.js';
import { IMarkdownString } from '../../../base/common/htmlContent.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
export declare class AllowedExtensionsService extends Disposable implements IAllowedExtensionsService {
    protected readonly configurationService: IConfigurationService;
    _serviceBrand: undefined;
    private readonly publisherOrgs;
    private _allowedExtensionsConfigValue;
    get allowedExtensionsConfigValue(): AllowedExtensionsConfigValueType | undefined;
    private _onDidChangeAllowedExtensions;
    readonly onDidChangeAllowedExtensionsConfigValue: import("../../../workbench/workbench.web.main.internal.js").Event<void>;
    constructor(productService: IProductService, configurationService: IConfigurationService);
    private getAllowedExtensionsValue;
    isAllowed(extension: IGalleryExtension | IExtension | {
        id: string;
        publisherDisplayName: string | undefined;
        version?: string;
        prerelease?: boolean;
        targetPlatform?: TargetPlatform;
    }): true | IMarkdownString;
}
