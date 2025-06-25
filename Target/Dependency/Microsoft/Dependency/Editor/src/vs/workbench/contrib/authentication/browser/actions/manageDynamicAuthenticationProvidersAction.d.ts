import { Action2 } from '../../../../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../../../../platform/instantiation/common/instantiation.js';
export declare class RemoveDynamicAuthenticationProvidersAction extends Action2 {
    static readonly ID = "workbench.action.removeDynamicAuthenticationProviders";
    constructor();
    run(accessor: ServicesAccessor): Promise<void>;
}
