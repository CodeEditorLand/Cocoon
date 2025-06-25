import { Disposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';
import { IChatContextPickService } from '../../chat/browser/chatContextPickService.js';
export declare class McpAddContextContribution extends Disposable implements IWorkbenchContribution {
    private readonly _chatContextPickService;
    private readonly _helper;
    private readonly _addContextMenu;
    constructor(_chatContextPickService: IChatContextPickService, instantiationService: IInstantiationService);
    private _registerAddContextMenu;
    private _getResourcePicks;
}
