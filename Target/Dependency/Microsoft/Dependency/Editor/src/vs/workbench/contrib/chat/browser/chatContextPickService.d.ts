import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';
import { IObservable } from '../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IQuickPickSeparator } from '../../../../platform/quickinput/common/quickInput.js';
import { IChatRequestVariableEntry } from '../common/chatVariableEntries.js';
import { IChatWidget } from './chat.js';
export interface IChatContextPickerPickItem {
    label: string;
    iconClass?: string;
    description?: string;
    detail?: string;
    disabled?: boolean;
    asAttachment(): IChatRequestVariableEntry | Promise<IChatRequestVariableEntry>;
}
export declare function isChatContextPickerPickItem(item: unknown): item is IChatContextPickerPickItem;
interface IChatContextItem {
    readonly label: string;
    readonly icon: ThemeIcon;
    readonly commandId?: string;
    readonly ordinal?: number;
    isEnabled?(widget: IChatWidget): Promise<boolean> | boolean;
}
export interface IChatContextValueItem extends IChatContextItem {
    readonly type: 'valuePick';
    asAttachment(widget: IChatWidget): Promise<IChatRequestVariableEntry | IChatRequestVariableEntry[] | undefined>;
}
export type ChatContextPick = IChatContextPickerPickItem | IQuickPickSeparator;
export interface IChatContextPicker {
    readonly placeholder: string;
    /**
     * Picks that should either be:
     * - A promise that resolves to the picked items
     * - A function that maps input query into items to display.
     */
    readonly picks: Promise<ChatContextPick[]> | ((query: IObservable<string>, token: CancellationToken) => IObservable<{
        busy: boolean;
        picks: ChatContextPick[];
    }>);
    readonly configure?: {
        label: string;
        commandId: string;
    };
}
export interface IChatContextPickerItem extends IChatContextItem {
    readonly type: 'pickerPick';
    asPicker(widget: IChatWidget): IChatContextPicker;
}
/**
 * Helper for use in {@IChatContextPickerItem} that wraps a simple query->promise
 * function into the requisite observable.
 */
export declare function picksWithPromiseFn(fn: (query: string, token: CancellationToken) => Promise<ChatContextPick[]>): (query: IObservable<string>, token: CancellationToken) => IObservable<{
    busy: boolean;
    picks: ChatContextPick[];
}>;
export interface IChatContextPickService {
    _serviceBrand: undefined;
    items: Iterable<IChatContextValueItem | IChatContextPickerItem>;
    /**
     * Register a value or  picker to the "Add Context" flow. A value directly resolved to a
     * chat attachment and a picker first shows a list of items to pick from and then
     * resolves the selected item to a chat attachment.
     */
    registerChatContextItem(item: IChatContextValueItem | IChatContextPickerItem): IDisposable;
}
export declare const IChatContextPickService: import("../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<IChatContextPickService>;
export declare class ChatContextPickService implements IChatContextPickService {
    _serviceBrand: undefined;
    private readonly _picks;
    readonly items: Iterable<IChatContextValueItem>;
    registerChatContextItem(pick: IChatContextValueItem): IDisposable;
}
export {};
