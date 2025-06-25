import { IListService, WorkbenchList } from '../../../../platform/list/browser/listService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ITerminalGroupService, ITerminalInstance, ITerminalService } from './terminal.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IDecorationsService } from '../../../services/decorations/common/decorations.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
export declare const enum TerminalTabsListSizes {
    TabHeight = 22,
    NarrowViewWidth = 46,
    WideViewMinimumWidth = 80,
    DefaultWidth = 120,
    MidpointViewWidth = 63,
    ActionbarMinimumWidth = 105,
    MaximumWidth = 500
}
export declare class TerminalTabList extends WorkbenchList<ITerminalInstance> {
    private readonly _configurationService;
    private readonly _terminalService;
    private readonly _terminalGroupService;
    private readonly _themeService;
    private readonly _storageService;
    private readonly _hoverService;
    private _decorationsProvider;
    private _terminalTabsSingleSelectedContextKey;
    private _isSplitContextKey;
    constructor(container: HTMLElement, disposableStore: DisposableStore, contextKeyService: IContextKeyService, listService: IListService, _configurationService: IConfigurationService, _terminalService: ITerminalService, _terminalGroupService: ITerminalGroupService, instantiationService: IInstantiationService, decorationsService: IDecorationsService, _themeService: IThemeService, _storageService: IStorageService, lifecycleService: ILifecycleService, _hoverService: IHoverService);
    private _getFocusMode;
    refresh(cancelEditing?: boolean): void;
    focusHover(): void;
    private _updateContextKey;
}
