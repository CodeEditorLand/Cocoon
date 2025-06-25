/**
 * @module StatusBar
 * @description Defines the service for creating and managing items in the
 * VS Code status bar.
 */
import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { Disposable, StatusBarAlignment, type AccessibilityInformation, type Command as VSCodeCommand, type MarkdownString, type StatusBarItem as VSCodeStatusBarItem, type ThemeColor, type CancellationToken, type ProviderResult } from "vscode";
import { Command as CommandInterface, CommandService } from "./Command.js";
import { IPC, IPCService } from "./IPC.js";
/**
 * @class StatusBarItemImplementation
 * @description An internal class that implements the `vscode.StatusBarItem` interface.
 * @implements {VSCodeStatusBarItem}
 */
declare class StatusBarItemImplementation implements VSCodeStatusBarItem {
    private readonly EntryId;
    private readonly ExtensionId;
    private readonly IPC;
    private readonly Command;
    private readonly OnDidDispose;
    private IsDisposed;
    private IsVisible;
    private _id;
    private _name;
    private _alignment;
    private _priority;
    private _text;
    private _tooltip;
    private _color;
    private _backgroundColor;
    private _command;
    private _accessibilityInformation;
    tooltip2: string | MarkdownString | ((token: CancellationToken) => ProviderResult<string | MarkdownString | undefined>) | undefined;
    constructor(EntryId: string, ExtensionId: string, IPC: IPC, Command: CommandInterface, OnDidDispose: () => void, InitialId: string, InitialAlignment: StatusBarAlignment, InitialPriority?: number);
    get id(): string;
    get alignment(): StatusBarAlignment;
    get priority(): number | undefined;
    get name(): string | undefined;
    set name(Value: string | undefined);
    get text(): string;
    set text(Value: string);
    get tooltip(): string | MarkdownString | undefined;
    set tooltip(Value: string | MarkdownString | undefined);
    get color(): string | ThemeColor | undefined;
    set color(Value: string | ThemeColor | undefined);
    get backgroundColor(): ThemeColor | undefined;
    set backgroundColor(Value: ThemeColor | undefined);
    get command(): string | VSCodeCommand | undefined;
    set command(Value: string | VSCodeCommand | undefined);
    get accessibilityInformation(): AccessibilityInformation | undefined;
    set accessibilityInformation(Value: AccessibilityInformation | undefined);
    show(): void;
    hide(): void;
    dispose(): void;
    private Update;
}
/**
 * @interface StatusBar
 * @description The contract for the StatusBar service.
 */
export interface StatusBar {
    readonly CreateStatusBarItem: (Extension: IExtensionDescription, Id?: string, Alignment?: StatusBarAlignment, Priority?: number) => Effect.Effect<VSCodeStatusBarItem, never>;
    readonly SetStatusBarMessage: (Text: string, HideOrPromise?: number | Promise<any>) => Disposable;
}
declare const StatusBarService_base: Effect.Service.Class<StatusBar, "Service/StatusBar", {
    readonly effect: Effect.Effect<{
        CreateStatusBarItem: (Extension: any, Id: any, Alignment: any, Priority: any) => Effect.Effect<StatusBarItemImplementation, never, never>;
        SetStatusBarMessage: (text: string, hideOrPromise?: number | Promise<any>) => Disposable;
    }, never, IPCService | CommandService>;
}>;
/**
 * @class StatusBarService
 * @description The `Effect.Service` for the StatusBar service.
 */
export declare class StatusBarService extends StatusBarService_base {
}
export {};
