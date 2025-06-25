import { Event } from '../../../base/common/event.js';
import { IAuxiliaryWindow } from '../../auxiliaryWindow/electron-main/auxiliaryWindow.js';
import { NativeParsedArgs } from '../../environment/common/argv.js';
import { ILifecycleMainService, IRelaunchHandler, LifecycleMainPhase, ShutdownEvent } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { IStateService } from '../../state/node/state.js';
import { ICodeWindow, UnloadReason } from '../../window/electron-main/window.js';
export declare class TestLifecycleMainService implements ILifecycleMainService {
    _serviceBrand: undefined;
    onBeforeShutdown: Event<any>;
    private readonly _onWillShutdown;
    readonly onWillShutdown: Event<ShutdownEvent>;
    fireOnWillShutdown(): Promise<void>;
    onWillLoadWindow: Event<any>;
    onBeforeCloseWindow: Event<any>;
    wasRestarted: boolean;
    quitRequested: boolean;
    phase: LifecycleMainPhase;
    registerWindow(window: ICodeWindow): void;
    registerAuxWindow(auxWindow: IAuxiliaryWindow): void;
    reload(window: ICodeWindow, cli?: NativeParsedArgs): Promise<void>;
    unload(window: ICodeWindow, reason: UnloadReason): Promise<boolean>;
    setRelaunchHandler(handler: IRelaunchHandler): void;
    relaunch(options?: {
        addArgs?: string[] | undefined;
        removeArgs?: string[] | undefined;
    }): Promise<void>;
    quit(willRestart?: boolean): Promise<boolean>;
    kill(code?: number): Promise<void>;
    when(phase: LifecycleMainPhase): Promise<void>;
}
export declare class InMemoryTestStateMainService implements IStateService {
    _serviceBrand: undefined;
    private readonly data;
    setItem(key: string, data?: object | string | number | boolean | undefined | null): void;
    setItems(items: readonly {
        key: string;
        data?: object | string | number | boolean | undefined | null;
    }[]): void;
    getItem<T>(key: string): T | undefined;
    removeItem(key: string): void;
    close(): Promise<void>;
}
