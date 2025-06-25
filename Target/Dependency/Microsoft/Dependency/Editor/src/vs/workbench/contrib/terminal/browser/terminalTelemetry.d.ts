import { Disposable } from '../../../../base/common/lifecycle.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import type { IWorkbenchContribution } from '../../../common/contributions.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { ITerminalService } from './terminal.js';
export declare class TerminalTelemetryContribution extends Disposable implements IWorkbenchContribution {
    private readonly _telemetryService;
    static ID: string;
    constructor(lifecycleService: ILifecycleService, terminalService: ITerminalService, _telemetryService: ITelemetryService);
    private _logCreateInstance;
}
