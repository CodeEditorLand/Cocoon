import BaseErrorTelemetry from '../common/errorTelemetry.js';
import { ITelemetryService } from '../common/telemetry.js';
import { ILogService } from '../../../platform/log/common/log.js';
export default class ErrorTelemetry extends BaseErrorTelemetry {
    private readonly logService;
    constructor(logService: ILogService, telemetryService: ITelemetryService);
    protected installErrorListeners(): void;
    private onUnexpectedError;
}
