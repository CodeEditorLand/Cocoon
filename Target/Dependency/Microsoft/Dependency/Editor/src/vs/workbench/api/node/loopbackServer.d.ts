import { URI } from '../../../base/common/uri.js';
import { ILogger } from '../../../platform/log/common/log.js';
export interface IOAuthResult {
    code: string;
    state: string;
}
export interface ILoopbackServer {
    /**
     * The state parameter used in the OAuth flow.
     */
    readonly state: string;
    /**
     * Starts the server.
     * @throws If the server fails to start.
     * @throws If the server is already started.
     */
    start(): Promise<void>;
    /**
     * Stops the server.
     * @throws If the server is not started.
     * @throws If the server fails to stop.
     */
    stop(): Promise<void>;
    /**
     * Returns a promise that resolves to the result of the OAuth flow.
     */
    waitForOAuthResponse(): Promise<IOAuthResult>;
}
export declare class LoopbackAuthServer implements ILoopbackServer {
    private readonly _logger;
    private readonly _appUri;
    private readonly _appName;
    private readonly _server;
    private readonly _resultPromise;
    private _state;
    private _port;
    constructor(_logger: ILogger, _appUri: URI, _appName: string);
    get state(): string;
    get redirectUri(): string;
    private _sendPage;
    start(): Promise<void>;
    stop(): Promise<void>;
    waitForOAuthResponse(): Promise<IOAuthResult>;
    getHtml(): string;
}
