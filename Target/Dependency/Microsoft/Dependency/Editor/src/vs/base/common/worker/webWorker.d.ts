import { Event } from '../event.js';
import { Disposable, IDisposable } from '../lifecycle.js';
export interface IWebWorker extends IDisposable {
    getId(): number;
    onMessage: Event<Message>;
    onError: Event<any>;
    postMessage(message: Message, transfer: ArrayBuffer[]): void;
}
export declare function logOnceWebWorkerWarning(err: any): void;
declare const enum MessageType {
    Request = 0,
    Reply = 1,
    SubscribeEvent = 2,
    Event = 3,
    UnsubscribeEvent = 4
}
declare class RequestMessage {
    readonly vsWorker: number;
    readonly req: string;
    readonly channel: string;
    readonly method: string;
    readonly args: any[];
    readonly type = MessageType.Request;
    constructor(vsWorker: number, req: string, channel: string, method: string, args: any[]);
}
declare class ReplyMessage {
    readonly vsWorker: number;
    readonly seq: string;
    readonly res: any;
    readonly err: any;
    readonly type = MessageType.Reply;
    constructor(vsWorker: number, seq: string, res: any, err: any);
}
declare class SubscribeEventMessage {
    readonly vsWorker: number;
    readonly req: string;
    readonly channel: string;
    readonly eventName: string;
    readonly arg: any;
    readonly type = MessageType.SubscribeEvent;
    constructor(vsWorker: number, req: string, channel: string, eventName: string, arg: any);
}
declare class EventMessage {
    readonly vsWorker: number;
    readonly req: string;
    readonly event: any;
    readonly type = MessageType.Event;
    constructor(vsWorker: number, req: string, event: any);
}
declare class UnsubscribeEventMessage {
    readonly vsWorker: number;
    readonly req: string;
    readonly type = MessageType.UnsubscribeEvent;
    constructor(vsWorker: number, req: string);
}
export type Message = RequestMessage | ReplyMessage | SubscribeEventMessage | EventMessage | UnsubscribeEventMessage;
type ProxiedMethodName = (`$${string}` | `on${string}`);
export type Proxied<T> = {
    [K in keyof T]: T[K] extends (...args: infer A) => infer R ? (K extends ProxiedMethodName ? (...args: A) => Promise<Awaited<R>> : never) : never;
};
export interface IWebWorkerClient<TProxy> {
    proxy: Proxied<TProxy>;
    dispose(): void;
    setChannel<T extends object>(channel: string, handler: T): void;
    getChannel<T extends object>(channel: string): Proxied<T>;
}
export interface IWebWorkerServer {
    setChannel<T extends object>(channel: string, handler: T): void;
    getChannel<T extends object>(channel: string): Proxied<T>;
}
/**
 * Main thread side
 */
export declare class WebWorkerClient<W extends object> extends Disposable implements IWebWorkerClient<W> {
    private readonly _worker;
    private readonly _onModuleLoaded;
    private readonly _protocol;
    readonly proxy: Proxied<W>;
    private readonly _localChannels;
    private readonly _remoteChannels;
    constructor(worker: IWebWorker);
    private _handleMessage;
    private _handleEvent;
    setChannel<T extends object>(channel: string, handler: T): void;
    getChannel<T extends object>(channel: string): Proxied<T>;
    private _onError;
}
export interface IWebWorkerServerRequestHandler {
    _requestHandlerBrand: any;
    [prop: string]: any;
}
export interface IWebWorkerServerRequestHandlerFactory<T extends IWebWorkerServerRequestHandler> {
    (workerServer: IWebWorkerServer): T;
}
/**
 * Worker side
 */
export declare class WebWorkerServer<T extends IWebWorkerServerRequestHandler> implements IWebWorkerServer {
    readonly requestHandler: T;
    private _protocol;
    private readonly _localChannels;
    private readonly _remoteChannels;
    constructor(postMessage: (msg: Message, transfer?: ArrayBuffer[]) => void, requestHandlerFactory: IWebWorkerServerRequestHandlerFactory<T>);
    onmessage(msg: any): void;
    private _handleMessage;
    private _handleEvent;
    setChannel<T extends object>(channel: string, handler: T): void;
    getChannel<T extends object>(channel: string): Proxied<T>;
    private initialize;
}
export {};
