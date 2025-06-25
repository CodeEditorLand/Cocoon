import { Event } from '../../../../base/common/event.js';
export declare const IChatStatusItemService: import("../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<IChatStatusItemService>;
export interface IChatStatusItemService {
    readonly _serviceBrand: undefined;
    readonly onDidChange: Event<IChatStatusItemChangeEvent>;
    setOrUpdateEntry(entry: ChatStatusEntry): void;
    deleteEntry(id: string): void;
    getEntries(): Iterable<ChatStatusEntry>;
}
export interface IChatStatusItemChangeEvent {
    readonly entry: ChatStatusEntry;
}
export type ChatStatusEntry = {
    id: string;
    label: string | {
        label: string;
        link: string;
    };
    description: string;
    detail: string | undefined;
};
