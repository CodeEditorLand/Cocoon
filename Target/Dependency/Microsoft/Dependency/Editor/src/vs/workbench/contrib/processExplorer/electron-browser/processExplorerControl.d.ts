import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IProcessService, IResolvedProcessInformation } from '../../../../platform/process/common/process.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ProcessExplorerControl } from '../browser/processExplorerControl.js';
export declare class NativeProcessExplorerControl extends ProcessExplorerControl {
    private readonly nativeHostService;
    private readonly processService;
    constructor(container: HTMLElement, instantiationService: IInstantiationService, productService: IProductService, contextMenuService: IContextMenuService, nativeHostService: INativeHostService, commandService: ICommandService, processService: IProcessService, clipboardService: IClipboardService);
    protected killProcess(pid: number, signal: string): Promise<void>;
    protected resolveProcesses(): Promise<IResolvedProcessInformation>;
}
