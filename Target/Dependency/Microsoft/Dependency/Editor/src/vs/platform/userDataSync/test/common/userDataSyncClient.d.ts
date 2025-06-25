import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IStringDictionary } from '../../../../base/common/collections.js';
import { FormattingOptions } from '../../../../base/common/jsonFormatter.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IHeaders, IRequestContext, IRequestOptions } from '../../../../base/parts/request/common/request.js';
import { TestInstantiationService } from '../../../instantiation/test/common/instantiationServiceMock.js';
import { AuthInfo, Credentials, IRequestService } from '../../../request/common/request.js';
import { IUserData, IUserDataSyncUtilService, SyncResource, IUserDataSynchroniser, IUserDataResourceManifest } from '../../common/userDataSync.js';
export declare class UserDataSyncClient extends Disposable {
    readonly testServer: UserDataSyncTestServer;
    readonly instantiationService: TestInstantiationService;
    constructor(testServer?: UserDataSyncTestServer);
    setUp(empty?: boolean): Promise<void>;
    sync(): Promise<void>;
    read(resource: SyncResource, collection?: string): Promise<IUserData>;
    getResourceManifest(): Promise<IUserDataResourceManifest | null>;
    getSynchronizer(source: SyncResource): IUserDataSynchroniser;
}
export declare class UserDataSyncTestServer implements IRequestService {
    private readonly rateLimit;
    private readonly retryAfter?;
    _serviceBrand: any;
    readonly url: string;
    private session;
    private readonly collections;
    private readonly data;
    private _requests;
    get requests(): {
        url: string;
        type: string;
        headers?: IHeaders;
    }[];
    private _requestsWithAllHeaders;
    get requestsWithAllHeaders(): {
        url: string;
        type: string;
        headers?: IHeaders;
    }[];
    private _responses;
    get responses(): {
        status: number;
    }[];
    reset(): void;
    private manifestRef;
    private collectionCounter;
    constructor(rateLimit?: number, retryAfter?: number | undefined);
    resolveProxy(url: string): Promise<string | undefined>;
    lookupAuthorization(authInfo: AuthInfo): Promise<Credentials | undefined>;
    lookupKerberosAuthorization(url: string): Promise<string | undefined>;
    loadCertificates(): Promise<string[]>;
    request(options: IRequestOptions, token: CancellationToken): Promise<IRequestContext>;
    private doRequest;
    private getManifest;
    private getResourceData;
    private writeData;
    private deleteResourceData;
    private createCollection;
    clear(headers?: IHeaders): Promise<IRequestContext>;
    private toResponse;
}
export declare class TestUserDataSyncUtilService implements IUserDataSyncUtilService {
    _serviceBrand: any;
    resolveDefaultCoreIgnoredSettings(): Promise<string[]>;
    resolveUserBindings(userbindings: string[]): Promise<IStringDictionary<string>>;
    resolveFormattingOptions(file?: URI): Promise<FormattingOptions>;
}
