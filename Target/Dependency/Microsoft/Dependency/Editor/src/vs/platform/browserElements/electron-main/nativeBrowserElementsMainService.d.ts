import { BrowserType, IElementData, INativeBrowserElementsService } from '../common/browserElements.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { IRectangle } from '../../window/common/window.js';
import { BrowserWindow } from 'electron';
import { IAuxiliaryWindowsMainService } from '../../auxiliaryWindow/electron-main/auxiliaryWindows.js';
import { IWindowsMainService } from '../../windows/electron-main/windows.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { AddFirstParameterToFunctions } from '../../../base/common/types.js';
export declare const INativeBrowserElementsMainService: import("../../instantiation/common/instantiation.js").ServiceIdentifier<INativeBrowserElementsMainService>;
export interface INativeBrowserElementsMainService extends AddFirstParameterToFunctions<INativeBrowserElementsService, Promise<unknown>, number | undefined> {
}
interface NodeDataResponse {
    outerHTML: string;
    computedStyle: string;
    bounds: IRectangle;
}
export declare class NativeBrowserElementsMainService extends Disposable implements INativeBrowserElementsMainService {
    private readonly windowsMainService;
    private readonly auxiliaryWindowsMainService;
    _serviceBrand: undefined;
    currentLocalAddress: string | undefined;
    constructor(windowsMainService: IWindowsMainService, auxiliaryWindowsMainService: IAuxiliaryWindowsMainService);
    get windowId(): never;
    findWebviewTarget(debuggers: any, windowId: number, browserType: BrowserType): Promise<string | undefined>;
    waitForWebviewTargets(debuggers: any, windowId: number, browserType: BrowserType): Promise<any>;
    startDebugSession(windowId: number | undefined, token: CancellationToken, browserType: BrowserType, cancelAndDetachId?: number): Promise<void>;
    finishOverlay(debuggers: any, sessionId: string | undefined): Promise<void>;
    getElementData(windowId: number | undefined, rect: IRectangle, token: CancellationToken, browserType: BrowserType, cancellationId?: number): Promise<IElementData | undefined>;
    getNodeData(sessionId: string, debuggers: any, window: BrowserWindow, cancellationId?: number): Promise<NodeDataResponse>;
    formatMatchedStyles(matched: any): string;
    private windowById;
    private codeWindowById;
    private auxiliaryWindowById;
}
export {};
