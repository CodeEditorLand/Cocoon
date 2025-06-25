import { MenuId } from '../../../../platform/actions/common/actions.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
export declare const enum InlineChatConfigKeys {
    FinishOnType = "inlineChat.finishOnType",
    StartWithOverlayWidget = "inlineChat.startWithOverlayWidget",
    HoldToSpeech = "inlineChat.holdToSpeech",
    AccessibleDiffView = "inlineChat.accessibleDiffView",
    LineEmptyHint = "inlineChat.lineEmptyHint",
    LineNLHint = "inlineChat.lineNaturalLanguageHint",
    EnableV2 = "inlineChat.enableV2",
    HideOnRequest = "inlineChat.hideOnRequest"
}
export declare const INLINE_CHAT_ID = "interactiveEditor";
export declare const INTERACTIVE_EDITOR_ACCESSIBILITY_HELP_ID = "interactiveEditorAccessiblityHelp";
export declare const enum InlineChatResponseType {
    None = "none",
    Messages = "messages",
    MessagesAndEdits = "messagesAndEdits"
}
export declare const CTX_INLINE_CHAT_POSSIBLE: RawContextKey<boolean>;
export declare const CTX_INLINE_CHAT_HAS_AGENT: RawContextKey<boolean>;
export declare const CTX_INLINE_CHAT_HAS_AGENT2: RawContextKey<boolean>;
export declare const CTX_INLINE_CHAT_VISIBLE: RawContextKey<boolean>;
export declare const CTX_INLINE_CHAT_FOCUSED: RawContextKey<boolean>;
export declare const CTX_INLINE_CHAT_EDITING: RawContextKey<boolean>;
export declare const CTX_INLINE_CHAT_RESPONSE_FOCUSED: RawContextKey<boolean>;
export declare const CTX_INLINE_CHAT_EMPTY: RawContextKey<boolean>;
export declare const CTX_INLINE_CHAT_INNER_CURSOR_FIRST: RawContextKey<boolean>;
export declare const CTX_INLINE_CHAT_INNER_CURSOR_LAST: RawContextKey<boolean>;
export declare const CTX_INLINE_CHAT_OUTER_CURSOR_POSITION: RawContextKey<"" | "above" | "below">;
export declare const CTX_INLINE_CHAT_HAS_STASHED_SESSION: RawContextKey<boolean>;
export declare const CTX_INLINE_CHAT_CHANGE_HAS_DIFF: RawContextKey<boolean>;
export declare const CTX_INLINE_CHAT_CHANGE_SHOWS_DIFF: RawContextKey<boolean>;
export declare const CTX_INLINE_CHAT_REQUEST_IN_PROGRESS: RawContextKey<boolean>;
export declare const CTX_INLINE_CHAT_RESPONSE_TYPE: RawContextKey<InlineChatResponseType>;
export declare const ACTION_START = "inlineChat.start";
export declare const ACTION_ACCEPT_CHANGES = "inlineChat.acceptChanges";
export declare const ACTION_DISCARD_CHANGES = "inlineChat.discardHunkChange";
export declare const ACTION_REGENERATE_RESPONSE = "inlineChat.regenerate";
export declare const ACTION_VIEW_IN_CHAT = "inlineChat.viewInChat";
export declare const ACTION_TOGGLE_DIFF = "inlineChat.toggleDiff";
export declare const ACTION_REPORT_ISSUE = "inlineChat.reportIssue";
export declare const MENU_INLINE_CHAT_WIDGET_STATUS: MenuId;
export declare const MENU_INLINE_CHAT_WIDGET_SECONDARY: MenuId;
export declare const MENU_INLINE_CHAT_ZONE: MenuId;
export declare const MENU_INLINE_CHAT_SIDE: MenuId;
export declare const inlineChatForeground: string;
export declare const inlineChatBackground: string;
export declare const inlineChatBorder: string;
export declare const inlineChatShadow: string;
export declare const inlineChatInputBorder: string;
export declare const inlineChatInputFocusBorder: string;
export declare const inlineChatInputPlaceholderForeground: string;
export declare const inlineChatInputBackground: string;
export declare const inlineChatDiffInserted: string;
export declare const overviewRulerInlineChatDiffInserted: string;
export declare const minimapInlineChatDiffInserted: string;
export declare const inlineChatDiffRemoved: string;
export declare const overviewRulerInlineChatDiffRemoved: string;
