import { Disposable } from '../../../base/common/lifecycle.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { ILoggerService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { ITelemetryAppender } from './telemetryUtils.js';
export declare class TelemetryLogAppender extends Disposable implements ITelemetryAppender {
    private readonly prefix;
    private readonly logger;
    constructor(prefix: string, remote: boolean, loggerService: ILoggerService, environmentService: IEnvironmentService, productService: IProductService);
    flush(): Promise<void>;
    log(eventName: string, data: any): void;
}
