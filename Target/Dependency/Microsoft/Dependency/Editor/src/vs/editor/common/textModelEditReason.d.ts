export declare class TextModelEditReason {
    readonly metadata: ITextModelEditReasonMetadata;
    private static _nextMetadataId;
    private static _metaDataMap;
    /**
     * Sets the reason for all text model edits done in the callback.
    */
    static editWithReason<T>(reason: TextModelEditReason, runner: () => T): T;
    static _getCurrentMetadata(): ITextModelEditReasonMetadata;
    constructor(metadata: ITextModelEditReasonMetadata);
}
interface ITextModelEditReasonMetadata {
    source?: 'Chat.applyEdits' | 'inlineChat.applyEdit' | 'reloadFromDisk';
    extensionId?: string;
    nes?: boolean;
    type?: 'word' | 'line';
    requestUuid?: string;
}
export {};
