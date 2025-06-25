import { Action2 } from '../../../../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../../../../platform/instantiation/common/instantiation.js';
export declare class ManageAccountPreferencesForMcpServerAction extends Action2 {
    constructor();
    run(accessor: ServicesAccessor, mcpServerId?: string, providerId?: string): Promise<void>;
}
