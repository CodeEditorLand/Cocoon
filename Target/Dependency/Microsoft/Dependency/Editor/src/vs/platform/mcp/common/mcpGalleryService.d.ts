import { CancellationToken } from '../../../base/common/cancellation.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IFileService } from '../../files/common/files.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { IRequestService } from '../../request/common/request.js';
import { IGalleryMcpServer, IMcpGalleryService, IMcpServerManifest, IQueryOptions } from './mcpManagement.js';
export declare class McpGalleryService extends Disposable implements IMcpGalleryService {
    private readonly configurationService;
    private readonly requestService;
    private readonly fileService;
    private readonly productService;
    private readonly logService;
    _serviceBrand: undefined;
    constructor(configurationService: IConfigurationService, requestService: IRequestService, fileService: IFileService, productService: IProductService, logService: ILogService);
    isEnabled(): boolean;
    query(options?: IQueryOptions, token?: CancellationToken): Promise<IGalleryMcpServer[]>;
    getManifest(gallery: IGalleryMcpServer, token: CancellationToken): Promise<IMcpServerManifest>;
    getReadme(gallery: IGalleryMcpServer, token: CancellationToken): Promise<string>;
    private toGalleryMcpServer;
    private fetchGallery;
    private getManifestUrl;
    private getMcpGalleryUrl;
}
