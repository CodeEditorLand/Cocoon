import { Disposable } from '../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
export declare class CodeCacheCleaner extends Disposable {
    private readonly logService;
    private readonly dataMaxAge;
    constructor(currentCodeCachePath: string | undefined, productService: IProductService, logService: ILogService);
    private cleanUpCodeCaches;
}
