import { ICodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { EditorAction2 } from '../../../../editor/browser/editorExtensions.js';
import { InlineChatController, InlineChatController1, InlineChatController2 } from './inlineChatController.js';
import { Action2, IAction2Options } from '../../../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { HunkInformation } from './inlineChatSession.js';
export declare const START_INLINE_CHAT: import("../../../../base/common/themables.js").ThemeIcon;
export interface IHoldForSpeech {
    (accessor: ServicesAccessor, controller: InlineChatController, source: Action2): void;
}
export declare function setHoldForSpeech(holdForSpeech: IHoldForSpeech): void;
export declare class StartSessionAction extends Action2 {
    constructor();
    run(accessor: ServicesAccessor, ...args: any[]): any;
    private _runEditorCommand;
}
export declare class FocusInlineChat extends EditorAction2 {
    constructor();
    runEditorCommand(_accessor: ServicesAccessor, editor: ICodeEditor, ..._args: any[]): void;
}
export declare class UnstashSessionAction extends EditorAction2 {
    constructor();
    runEditorCommand(_accessor: ServicesAccessor, editor: ICodeEditor, ..._args: any[]): Promise<void>;
}
export declare abstract class AbstractInline1ChatAction extends EditorAction2 {
    static readonly category: import("../../../../nls.js").ILocalizedString;
    constructor(desc: IAction2Options);
    runEditorCommand(accessor: ServicesAccessor, editor: ICodeEditor, ..._args: any[]): void;
    abstract runInlineChatCommand(accessor: ServicesAccessor, ctrl: InlineChatController1, editor: ICodeEditor, ...args: any[]): void;
}
export declare class ArrowOutUpAction extends AbstractInline1ChatAction {
    constructor();
    runInlineChatCommand(_accessor: ServicesAccessor, ctrl: InlineChatController1, _editor: ICodeEditor, ..._args: any[]): void;
}
export declare class ArrowOutDownAction extends AbstractInline1ChatAction {
    constructor();
    runInlineChatCommand(_accessor: ServicesAccessor, ctrl: InlineChatController1, _editor: ICodeEditor, ..._args: any[]): void;
}
export declare class AcceptChanges extends AbstractInline1ChatAction {
    constructor();
    runInlineChatCommand(_accessor: ServicesAccessor, ctrl: InlineChatController1, _editor: ICodeEditor, hunk?: HunkInformation | any): Promise<void>;
}
export declare class DiscardHunkAction extends AbstractInline1ChatAction {
    constructor();
    runInlineChatCommand(_accessor: ServicesAccessor, ctrl: InlineChatController1, _editor: ICodeEditor, hunk?: HunkInformation | any): Promise<void>;
}
export declare class RerunAction extends AbstractInline1ChatAction {
    constructor();
    runInlineChatCommand(accessor: ServicesAccessor, ctrl: InlineChatController1, _editor: ICodeEditor, ..._args: any[]): Promise<void>;
}
export declare class CloseAction extends AbstractInline1ChatAction {
    constructor();
    runInlineChatCommand(_accessor: ServicesAccessor, ctrl: InlineChatController1, _editor: ICodeEditor, ..._args: any[]): Promise<void>;
}
export declare class ConfigureInlineChatAction extends AbstractInline1ChatAction {
    constructor();
    runInlineChatCommand(accessor: ServicesAccessor, ctrl: InlineChatController1, _editor: ICodeEditor, ..._args: any[]): Promise<void>;
}
export declare class MoveToNextHunk extends AbstractInline1ChatAction {
    constructor();
    runInlineChatCommand(accessor: ServicesAccessor, ctrl: InlineChatController1, editor: ICodeEditor, ...args: any[]): void;
}
export declare class MoveToPreviousHunk extends AbstractInline1ChatAction {
    constructor();
    runInlineChatCommand(accessor: ServicesAccessor, ctrl: InlineChatController1, editor: ICodeEditor, ...args: any[]): void;
}
export declare class ViewInChatAction extends AbstractInline1ChatAction {
    constructor();
    runInlineChatCommand(_accessor: ServicesAccessor, ctrl: InlineChatController1, _editor: ICodeEditor, ..._args: any[]): Promise<void>;
}
export declare class ToggleDiffForChange extends AbstractInline1ChatAction {
    constructor();
    runInlineChatCommand(_accessor: ServicesAccessor, ctrl: InlineChatController1, _editor: ICodeEditor, hunkInfo: HunkInformation | any): void;
}
declare abstract class AbstractInline2ChatAction extends EditorAction2 {
    static readonly category: import("../../../../nls.js").ILocalizedString;
    constructor(desc: IAction2Options);
    runEditorCommand(accessor: ServicesAccessor, editor: ICodeEditor, ..._args: any[]): void;
    abstract runInlineChatCommand(accessor: ServicesAccessor, ctrl: InlineChatController2, editor: ICodeEditor, ...args: any[]): void;
}
declare class KeepOrUndoSessionAction extends AbstractInline2ChatAction {
    private readonly _keep;
    constructor(id: string, _keep: boolean);
    runInlineChatCommand(accessor: ServicesAccessor, _ctrl: InlineChatController2, editor: ICodeEditor, ..._args: any[]): Promise<void>;
}
export declare class KeepSessionAction2 extends KeepOrUndoSessionAction {
    constructor();
}
export declare class UndoSessionAction2 extends KeepOrUndoSessionAction {
    constructor();
}
export declare class CloseSessionAction2 extends AbstractInline2ChatAction {
    constructor();
    runInlineChatCommand(accessor: ServicesAccessor, _ctrl: InlineChatController2, editor: ICodeEditor, ...args: any[]): void;
}
export declare class RevealWidget extends AbstractInline2ChatAction {
    constructor();
    runInlineChatCommand(_accessor: ServicesAccessor, ctrl: InlineChatController2, _editor: ICodeEditor): void;
}
export declare class CancelRequestAction extends AbstractInline2ChatAction {
    constructor();
    runInlineChatCommand(accessor: ServicesAccessor, ctrl: InlineChatController2, _editor: ICodeEditor): void;
}
export {};
