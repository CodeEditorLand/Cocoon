import { ITerminalInstance } from './terminal.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import type { IHoverAction } from '../../../../base/browser/ui/hover/hover.js';
import { type IStorageService } from '../../../../platform/storage/common/storage.js';
export declare function getInstanceHoverInfo(instance: ITerminalInstance, storageService: IStorageService): {
    content: MarkdownString;
    actions: IHoverAction[];
};
export declare function getShellProcessTooltip(instance: ITerminalInstance, showDetailed: boolean): string;
export declare function refreshShellIntegrationInfoStatus(instance: ITerminalInstance): void;
