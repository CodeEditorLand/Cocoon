export declare enum ChatConfiguration {
    UseFileStorage = "chat.useFileStorage",
    AgentEnabled = "chat.agent.enabled",
    Edits2Enabled = "chat.edits2.enabled",
    ExtensionToolsEnabled = "chat.extensionTools.enabled"
}
export declare enum ChatMode {
    Ask = "ask",
    Edit = "edit",
    Agent = "agent"
}
export declare function modeToString(mode: ChatMode): "Agent" | "Edit" | "Ask";
export declare function validateChatMode(mode: unknown): ChatMode | undefined;
export declare function isChatMode(mode: unknown): mode is ChatMode;
export type RawChatParticipantLocation = 'panel' | 'terminal' | 'notebook' | 'editing-session';
export declare enum ChatAgentLocation {
    Panel = "panel",
    Terminal = "terminal",
    Notebook = "notebook",
    Editor = "editor"
}
export declare namespace ChatAgentLocation {
    function fromRaw(value: RawChatParticipantLocation | string): ChatAgentLocation;
}
