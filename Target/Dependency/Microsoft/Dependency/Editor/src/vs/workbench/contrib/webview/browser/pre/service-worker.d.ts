declare const sw: ServiceWorkerGlobalScope;
declare const VERSION = 4;
declare const resourceCacheName = "vscode-resource-cache-4";
declare const rootPath: string;
declare const searchParams: URLSearchParams;
declare const remoteAuthority: string | null;
declare let outerIframeMessagePort: MessagePort | undefined;
/**
 * Origin used for resources
 */
declare const resourceBaseAuthority: string | null;
declare const resolveTimeout = 30000;
type RequestStoreResult<T> = {
    status: 'ok';
    value: T;
} | {
    status: 'timeout';
};
interface RequestStoreEntry<T> {
    resolve: (x: RequestStoreResult<T>) => void;
    promise: Promise<RequestStoreResult<T>>;
}
declare class RequestStore<T> {
    private map;
    private requestPool;
    create(): {
        requestId: number;
        promise: Promise<RequestStoreResult<T>>;
    };
    resolve(requestId: number, result: T): boolean;
}
/**
 * Map of requested paths to responses.
 */
declare const resourceRequestStore: RequestStore<ResourceResponse>;
/**
 * Map of requested localhost origins to optional redirects.
 */
declare const localhostRequestStore: RequestStore<string | undefined>;
declare const unauthorized: () => Response;
declare const notFound: () => Response;
declare const methodNotAllowed: () => Response;
declare const requestTimeout: () => Response;
interface ResourceRequestUrlComponents {
    scheme: string;
    authority: string;
    path: string;
    query: string;
}
declare function processResourceRequest(event: FetchEvent, requestUrlComponents: ResourceRequestUrlComponents): Promise<Response>;
declare function processLocalhostRequest(event: FetchEvent, requestUrl: URL): Promise<Response>;
declare function getWebviewIdForClient(client: Client): string | null;
declare function getOuterIframeClient(webviewId: string): Promise<Client[]>;
declare function getWorkerClientForId(clientId: string): Promise<Client | undefined>;
type ResourceResponse = {
    readonly status: 200;
    id: number;
    path: string;
    mime: string;
    data: Uint8Array;
    etag: string | undefined;
    mtime: number | undefined;
} | {
    readonly status: 304;
    id: number;
    path: string;
    mime: string;
    mtime: number | undefined;
} | {
    readonly status: 401;
    id: number;
    path: string;
} | {
    readonly status: 404;
    id: number;
    path: string;
};
