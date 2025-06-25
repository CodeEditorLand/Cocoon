import { ServicesAccessor } from '../../../../../editor/browser/editorExtensions.js';
import { Action2, IAction2Options } from '../../../../../platform/actions/common/actions.js';
import { IChatEditingSession } from '../../common/chatEditingService.js';
import { IChatWidget } from '../chat.js';
export declare abstract class EditingSessionAction extends Action2 {
    constructor(opts: Readonly<IAction2Options>);
    run(accessor: ServicesAccessor, ...args: any[]): any;
    abstract runEditingSessionAction(accessor: ServicesAccessor, editingSession: IChatEditingSession, chatWidget: IChatWidget, ...args: any[]): any;
}
export declare function getEditingSessionContext(accessor: ServicesAccessor, args: any[]): {
    editingSession?: IChatEditingSession;
    chatWidget: IChatWidget;
} | undefined;
export declare class ChatEditingAcceptAllAction extends EditingSessionAction {
    constructor();
    runEditingSessionAction(accessor: ServicesAccessor, editingSession: IChatEditingSession, chatWidget: IChatWidget, ...args: any[]): Promise<void>;
}
export declare class ChatEditingDiscardAllAction extends EditingSessionAction {
    constructor();
    runEditingSessionAction(accessor: ServicesAccessor, editingSession: IChatEditingSession, chatWidget: IChatWidget, ...args: any[]): Promise<void>;
}
export declare function discardAllEditsWithConfirmation(accessor: ServicesAccessor, currentEditingSession: IChatEditingSession): Promise<boolean>;
export declare class ChatEditingShowChangesAction extends EditingSessionAction {
    static readonly ID = "chatEditing.viewChanges";
    static readonly LABEL: string;
    constructor();
    runEditingSessionAction(accessor: ServicesAccessor, editingSession: IChatEditingSession, chatWidget: IChatWidget, ...args: any[]): Promise<void>;
}
export declare class ViewPreviousEditsAction extends EditingSessionAction {
    static readonly Id = "chatEditing.viewPreviousEdits";
    static readonly Label: string;
    constructor();
    runEditingSessionAction(accessor: ServicesAccessor, editingSession: IChatEditingSession, chatWidget: IChatWidget, ...args: any[]): Promise<void>;
}
