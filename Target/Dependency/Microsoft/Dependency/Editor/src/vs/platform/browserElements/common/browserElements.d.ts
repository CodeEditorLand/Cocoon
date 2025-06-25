import { CancellationToken } from '../../../base/common/cancellation.js';
import { IRectangle } from '../../window/common/window.js';
export declare const INativeBrowserElementsService: import("../../instantiation/common/instantiation.js").ServiceIdentifier<INativeBrowserElementsService>;
export interface IElementData {
    readonly outerHTML: string;
    readonly computedStyle: string;
    readonly bounds: IRectangle;
}
export declare enum BrowserType {
    SimpleBrowser = "simpleBrowser",
    LiveServer = "liveServer"
}
export interface INativeBrowserElementsService {
    readonly _serviceBrand: undefined;
    readonly windowId: number;
    getElementData(rect: IRectangle, token: CancellationToken, browserType: BrowserType, cancellationId?: number): Promise<IElementData | undefined>;
    startDebugSession(token: CancellationToken, browserType: BrowserType, cancelAndDetachId?: number): Promise<void>;
}
