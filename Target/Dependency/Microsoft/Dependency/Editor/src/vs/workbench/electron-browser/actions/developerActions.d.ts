import { Action2 } from '../../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../../platform/instantiation/common/instantiation.js';
export declare class ToggleDevToolsAction extends Action2 {
    constructor();
    run(accessor: ServicesAccessor): Promise<void>;
}
export declare class ConfigureRuntimeArgumentsAction extends Action2 {
    constructor();
    run(accessor: ServicesAccessor): Promise<void>;
}
export declare class ReloadWindowWithExtensionsDisabledAction extends Action2 {
    constructor();
    run(accessor: ServicesAccessor): Promise<void>;
}
export declare class OpenUserDataFolderAction extends Action2 {
    constructor();
    run(accessor: ServicesAccessor): Promise<void>;
}
export declare class ShowGPUInfoAction extends Action2 {
    constructor();
    run(accessor: ServicesAccessor): void;
}
export declare class StopTracing extends Action2 {
    static readonly ID = "workbench.action.stopTracing";
    constructor();
    run(accessor: ServicesAccessor): Promise<void>;
}
