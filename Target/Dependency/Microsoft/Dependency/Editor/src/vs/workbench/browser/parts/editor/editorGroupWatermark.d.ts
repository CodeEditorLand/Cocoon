import { Disposable } from '../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
export declare class EditorGroupWatermark extends Disposable {
    private readonly keybindingService;
    private readonly contextService;
    private readonly contextKeyService;
    private readonly configurationService;
    private readonly storageService;
    private static readonly CACHED_WHEN;
    private readonly cachedWhen;
    private readonly shortcuts;
    private readonly transientDisposables;
    private readonly keybindingLabels;
    private enabled;
    private workbenchState;
    constructor(container: HTMLElement, keybindingService: IKeybindingService, contextService: IWorkspaceContextService, contextKeyService: IContextKeyService, configurationService: IConfigurationService, storageService: IStorageService);
    private registerListeners;
    private render;
    private filterEntries;
}
