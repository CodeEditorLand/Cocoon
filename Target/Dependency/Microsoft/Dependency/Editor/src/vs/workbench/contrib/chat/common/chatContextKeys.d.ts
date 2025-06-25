import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { ViewContainerLocation } from '../../../common/views.js';
import { ChatAgentLocation, ChatMode } from './constants.js';
export declare namespace ChatContextKeys {
    const responseVote: RawContextKey<string>;
    const responseDetectedAgentCommand: RawContextKey<boolean>;
    const responseSupportsIssueReporting: RawContextKey<boolean>;
    const responseIsFiltered: RawContextKey<boolean>;
    const responseHasError: RawContextKey<boolean>;
    const requestInProgress: RawContextKey<boolean>;
    const isRequestPaused: RawContextKey<boolean>;
    const canRequestBePaused: RawContextKey<boolean>;
    const isResponse: RawContextKey<boolean>;
    const isRequest: RawContextKey<boolean>;
    const itemId: RawContextKey<string>;
    const lastItemId: RawContextKey<string[]>;
    const editApplied: RawContextKey<boolean>;
    const inputHasText: RawContextKey<boolean>;
    const inputHasFocus: RawContextKey<boolean>;
    const inChatInput: RawContextKey<boolean>;
    const inChatSession: RawContextKey<boolean>;
    const inChatEditor: RawContextKey<boolean>;
    const hasPromptFile: RawContextKey<boolean>;
    const chatMode: RawContextKey<ChatMode>;
    const supported: import("../../../../platform/contextkey/common/contextkey.js").ContextKeyExpression | undefined;
    const enabled: RawContextKey<boolean>;
    const extensionParticipantRegistered: RawContextKey<boolean>;
    const panelParticipantRegistered: RawContextKey<boolean>;
    const editingParticipantRegistered: RawContextKey<boolean>;
    const chatEditingCanUndo: RawContextKey<boolean>;
    const chatEditingCanRedo: RawContextKey<boolean>;
    const extensionInvalid: RawContextKey<boolean>;
    const inputCursorAtTop: RawContextKey<boolean>;
    const inputHasAgent: RawContextKey<boolean>;
    const location: RawContextKey<ChatAgentLocation>;
    const inQuickChat: RawContextKey<boolean>;
    const hasFileAttachments: RawContextKey<boolean>;
    const languageModelsAreUserSelectable: RawContextKey<boolean>;
    const Setup: {
        hidden: RawContextKey<boolean>;
        installed: RawContextKey<boolean>;
        disabled: RawContextKey<boolean>;
        later: RawContextKey<boolean>;
    };
    const Entitlement: {
        signedOut: RawContextKey<boolean>;
        canSignUp: RawContextKey<boolean>;
        free: RawContextKey<boolean>;
        pro: RawContextKey<boolean>;
        proPlus: RawContextKey<boolean>;
        business: RawContextKey<boolean>;
        enterprise: RawContextKey<boolean>;
    };
    const chatQuotaExceeded: RawContextKey<boolean>;
    const completionsQuotaExceeded: RawContextKey<boolean>;
    const Editing: {
        agentModeDisallowed: RawContextKey<boolean>;
        hasToolConfirmation: RawContextKey<boolean>;
    };
    const Tools: {
        toolsCount: RawContextKey<number>;
    };
    const Modes: {
        hasCustomChatModes: RawContextKey<boolean>;
    };
    const panelLocation: RawContextKey<ViewContainerLocation>;
}
export declare namespace ChatContextKeyExprs {
    const inEditingMode: import("../../../../platform/contextkey/common/contextkey.js").ContextKeyExpression | undefined;
}
