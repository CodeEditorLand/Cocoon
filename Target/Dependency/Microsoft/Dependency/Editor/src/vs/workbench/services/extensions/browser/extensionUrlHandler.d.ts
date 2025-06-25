import { IDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IURLHandler } from '../../../../platform/url/common/url.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
export declare const IExtensionUrlHandler: import("../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<IExtensionUrlHandler>;
export interface IExtensionContributedURLHandler extends IURLHandler {
    extensionDisplayName: string;
}
export interface IExtensionUrlHandler {
    readonly _serviceBrand: undefined;
    registerExtensionHandler(extensionId: ExtensionIdentifier, handler: IExtensionContributedURLHandler): void;
    unregisterExtensionHandler(extensionId: ExtensionIdentifier): void;
}
export interface IExtensionUrlHandlerOverride {
    canHandleURL(uri: URI): boolean;
    handleURL(uri: URI): Promise<boolean>;
}
export declare class ExtensionUrlHandlerOverrideRegistry {
    private static readonly handlers;
    static registerHandler(handler: IExtensionUrlHandlerOverride): IDisposable;
    static getHandler(uri: URI): IExtensionUrlHandlerOverride | undefined;
}
