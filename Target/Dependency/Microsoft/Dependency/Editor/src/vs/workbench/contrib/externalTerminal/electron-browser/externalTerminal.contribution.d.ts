import { IWorkbenchContribution } from '../../../common/contributions.js';
import { IExternalTerminalService } from '../../../../platform/externalTerminal/electron-browser/externalTerminalService.js';
export declare class ExternalTerminalContribution implements IWorkbenchContribution {
    private readonly _externalTerminalService;
    _serviceBrand: undefined;
    constructor(_externalTerminalService: IExternalTerminalService);
    private _updateConfiguration;
}
