import { ServicesAccessor } from '../../../../../editor/browser/editorExtensions.js';
import { Action2, IAction2Options } from '../../../../../platform/actions/common/actions.js';
import { IChatEditingSession, IModifiedFileEntry, IModifiedFileEntryEditorIntegration } from '../../common/chatEditingService.js';
declare abstract class ChatEditingEditorAction extends Action2 {
    constructor(desc: Readonly<IAction2Options>);
    run(accessor: ServicesAccessor, ...args: any[]): Promise<void>;
    abstract runChatEditingCommand(accessor: ServicesAccessor, session: IChatEditingSession, entry: IModifiedFileEntry, integration: IModifiedFileEntryEditorIntegration, ...args: any[]): Promise<void> | void;
}
declare abstract class KeepOrUndoAction extends ChatEditingEditorAction {
    private _keep;
    constructor(id: string, _keep: boolean);
    runChatEditingCommand(accessor: ServicesAccessor, session: IChatEditingSession, entry: IModifiedFileEntry, _integration: IModifiedFileEntryEditorIntegration): Promise<void>;
}
export declare class AcceptAction extends KeepOrUndoAction {
    static readonly ID = "chatEditor.action.accept";
    constructor();
}
export declare class RejectAction extends KeepOrUndoAction {
    static readonly ID = "chatEditor.action.reject";
    constructor();
}
export declare class ReviewChangesAction extends ChatEditingEditorAction {
    constructor();
    runChatEditingCommand(_accessor: ServicesAccessor, _session: IChatEditingSession, entry: IModifiedFileEntry, _integration: IModifiedFileEntryEditorIntegration, ..._args: any[]): void;
}
export declare class AcceptAllEditsAction extends ChatEditingEditorAction {
    static readonly ID = "chatEditor.action.acceptAllEdits";
    constructor();
    runChatEditingCommand(_accessor: ServicesAccessor, session: IChatEditingSession, _entry: IModifiedFileEntry, _integration: IModifiedFileEntryEditorIntegration, ..._args: any[]): Promise<void>;
}
export declare function registerChatEditorActions(): void;
export declare const navigationBearingFakeActionId = "chatEditor.navigation.bearings";
export {};
