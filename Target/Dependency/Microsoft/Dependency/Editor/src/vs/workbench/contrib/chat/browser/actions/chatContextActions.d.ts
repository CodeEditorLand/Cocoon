import { ServicesAccessor } from '../../../../../editor/browser/editorExtensions.js';
import { Action2 } from '../../../../../platform/actions/common/actions.js';
export declare function registerChatContextActions(): void;
export declare class AttachSearchResultAction extends Action2 {
    private static readonly Name;
    constructor();
    run(accessor: ServicesAccessor): Promise<void>;
}
export declare class AttachContextAction extends Action2 {
    constructor();
    run(accessor: ServicesAccessor, ...args: any[]): Promise<void>;
    private _show;
    private _handleQPPick;
    private _handleContextPick;
    private _handleContextPickerItem;
}
