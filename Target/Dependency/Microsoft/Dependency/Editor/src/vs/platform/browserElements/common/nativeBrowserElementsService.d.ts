import { IMainProcessService } from '../../ipc/common/mainProcessService.js';
import { INativeBrowserElementsService } from './browserElements.js';
export declare class NativeBrowserElementsService implements INativeBrowserElementsService {
    readonly windowId: number;
    readonly _serviceBrand: undefined;
    constructor(windowId: number, mainProcessService: IMainProcessService);
}
