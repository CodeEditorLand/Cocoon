import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IOpenURLOptions, IURLHandler, IURLService } from '../../../../platform/url/common/url.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';
export declare class McpUrlHandler extends Disposable implements IWorkbenchContribution, IURLHandler {
    private readonly _instaService;
    private readonly _fileService;
    static readonly scheme = "mcp-install";
    private readonly _fileSystemProvider;
    constructor(urlService: IURLService, _instaService: IInstantiationService, _fileService: IFileService);
    handleURL(uri: URI, options?: IOpenURLOptions): Promise<boolean>;
}
