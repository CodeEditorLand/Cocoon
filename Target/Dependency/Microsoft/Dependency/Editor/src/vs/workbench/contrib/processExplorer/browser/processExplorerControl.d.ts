import './media/processExplorer.css';
import { Dimension } from '../../../../base/browser/dom.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IResolvedProcessInformation } from '../../../../platform/process/common/process.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
export declare abstract class ProcessExplorerControl extends Disposable {
    private readonly instantiationService;
    private readonly productService;
    private readonly contextMenuService;
    private readonly commandService;
    private readonly clipboardService;
    private dimensions;
    private readonly model;
    private tree;
    private readonly delayer;
    constructor(instantiationService: IInstantiationService, productService: IProductService, contextMenuService: IContextMenuService, commandService: ICommandService, clipboardService: IClipboardService);
    protected killProcess?(pid: number, signal: string): Promise<void>;
    protected abstract resolveProcesses(): Promise<IResolvedProcessInformation>;
    protected create(container: HTMLElement): void;
    private createProcessTree;
    private onTreeKeyDown;
    private onTreeContextMenu;
    private isDebuggable;
    private attachTo;
    private getSelectedPids;
    private update;
    focus(): void;
    layout(dimension: Dimension): void;
    private layoutTree;
}
export declare class BrowserProcessExplorerControl extends ProcessExplorerControl {
    private readonly remoteAgentService;
    private readonly labelService;
    constructor(container: HTMLElement, instantiationService: IInstantiationService, productService: IProductService, contextMenuService: IContextMenuService, commandService: ICommandService, clipboardService: IClipboardService, remoteAgentService: IRemoteAgentService, labelService: ILabelService);
    protected resolveProcesses(): Promise<IResolvedProcessInformation>;
}
