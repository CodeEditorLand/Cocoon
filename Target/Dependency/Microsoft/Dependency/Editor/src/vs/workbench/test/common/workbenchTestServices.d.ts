import { URI } from '../../../base/common/uri.js';
import { Event } from '../../../base/common/event.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { IWorkspaceContextService, IWorkspace, WorkbenchState, IWorkspaceFolder, IWorkspaceFoldersChangeEvent, IWorkspaceFoldersWillChangeEvent, ISingleFolderWorkspaceIdentifier, IWorkspaceIdentifier } from '../../../platform/workspace/common/workspace.js';
import { ITextResourcePropertiesService } from '../../../editor/common/services/textResourceConfiguration.js';
import { InMemoryStorageService, WillSaveStateReason } from '../../../platform/storage/common/storage.js';
import { IWorkingCopy, IWorkingCopyBackup, WorkingCopyCapabilities } from '../../services/workingCopy/common/workingCopy.js';
import { NullExtensionService } from '../../services/extensions/common/extensions.js';
import { IWorkingCopyFileService, IWorkingCopyFileOperationParticipant, WorkingCopyFileEvent, IDeleteOperation, ICopyOperation, IMoveOperation, IFileOperationUndoRedoInfo, ICreateFileOperation, ICreateOperation, IStoredFileWorkingCopySaveParticipant, IStoredFileWorkingCopySaveParticipantContext } from '../../services/workingCopy/common/workingCopyFileService.js';
import { IDisposable, Disposable } from '../../../base/common/lifecycle.js';
import { IBaseFileStat, IFileStatWithMetadata } from '../../../platform/files/common/files.js';
import { ISaveOptions, IRevertOptions, GroupIdentifier } from '../../common/editor.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { IActivity, IActivityService } from '../../services/activity/common/activity.js';
import { IStoredFileWorkingCopySaveEvent } from '../../services/workingCopy/common/storedFileWorkingCopy.js';
import { AbstractLoggerService, ILogger } from '../../../platform/log/common/log.js';
import { IResourceEditorInput } from '../../../platform/editor/common/editor.js';
import { EditorInput } from '../../common/editor/editorInput.js';
import { IHistoryService } from '../../services/history/common/history.js';
import { IAutoSaveConfiguration, IAutoSaveMode } from '../../services/filesConfiguration/common/filesConfigurationService.js';
import { IWorkspaceTrustEnablementService, IWorkspaceTrustManagementService, IWorkspaceTrustRequestService, IWorkspaceTrustTransitionParticipant, IWorkspaceTrustUriInfo, WorkspaceTrustRequestOptions, WorkspaceTrustUriResponse } from '../../../platform/workspace/common/workspaceTrust.js';
import { IMarker, IMarkerData, IMarkerService, IResourceMarker, MarkerStatistics } from '../../../platform/markers/common/markers.js';
import { IProgress, IProgressStep } from '../../../platform/progress/common/progress.js';
export declare class TestLoggerService extends AbstractLoggerService {
    constructor(logsHome?: URI);
    protected doCreateLogger(): ILogger;
}
export declare class TestTextResourcePropertiesService implements ITextResourcePropertiesService {
    private readonly configurationService;
    readonly _serviceBrand: undefined;
    constructor(configurationService: IConfigurationService);
    getEOL(resource: URI, language?: string): string;
}
export declare class TestContextService implements IWorkspaceContextService {
    readonly _serviceBrand: undefined;
    private workspace;
    private options;
    private readonly _onDidChangeWorkspaceName;
    get onDidChangeWorkspaceName(): Event<void>;
    private readonly _onWillChangeWorkspaceFolders;
    get onWillChangeWorkspaceFolders(): Event<IWorkspaceFoldersWillChangeEvent>;
    private readonly _onDidChangeWorkspaceFolders;
    get onDidChangeWorkspaceFolders(): Event<IWorkspaceFoldersChangeEvent>;
    private readonly _onDidChangeWorkbenchState;
    get onDidChangeWorkbenchState(): Event<WorkbenchState>;
    constructor(workspace?: import("../../../platform/workspace/test/common/testWorkspace.js").Workspace, options?: null);
    getFolders(): IWorkspaceFolder[];
    getWorkbenchState(): WorkbenchState;
    getCompleteWorkspace(): Promise<IWorkspace>;
    getWorkspace(): IWorkspace;
    getWorkspaceFolder(resource: URI): IWorkspaceFolder | null;
    setWorkspace(workspace: any): void;
    getOptions(): object;
    updateOptions(): void;
    isInsideWorkspace(resource: URI): boolean;
    toResource(workspaceRelativePath: string): URI;
    isCurrentWorkspace(workspaceIdOrFolder: IWorkspaceIdentifier | ISingleFolderWorkspaceIdentifier | URI): boolean;
}
export declare class TestStorageService extends InMemoryStorageService {
    testEmitWillSaveState(reason: WillSaveStateReason): void;
}
export declare class TestHistoryService implements IHistoryService {
    private root?;
    readonly _serviceBrand: undefined;
    constructor(root?: URI | undefined);
    reopenLastClosedEditor(): Promise<void>;
    goForward(): Promise<void>;
    goBack(): Promise<void>;
    goPrevious(): Promise<void>;
    goLast(): Promise<void>;
    removeFromHistory(_input: EditorInput | IResourceEditorInput): void;
    clear(): void;
    clearRecentlyOpened(): void;
    getHistory(): readonly (EditorInput | IResourceEditorInput)[];
    openNextRecentlyUsedEditor(group?: GroupIdentifier): Promise<void>;
    openPreviouslyUsedEditor(group?: GroupIdentifier): Promise<void>;
    getLastActiveWorkspaceRoot(_schemeFilter: string): URI | undefined;
    getLastActiveFile(_schemeFilter: string): URI | undefined;
}
export declare class TestWorkingCopy extends Disposable implements IWorkingCopy {
    readonly resource: URI;
    readonly typeId: string;
    private readonly _onDidChangeDirty;
    readonly onDidChangeDirty: Event<void>;
    private readonly _onDidChangeContent;
    readonly onDidChangeContent: Event<void>;
    private readonly _onDidSave;
    readonly onDidSave: Event<IStoredFileWorkingCopySaveEvent>;
    readonly capabilities = WorkingCopyCapabilities.None;
    readonly name: string;
    private dirty;
    constructor(resource: URI, isDirty?: boolean, typeId?: string);
    setDirty(dirty: boolean): void;
    setContent(content: string): void;
    isDirty(): boolean;
    isModified(): boolean;
    save(options?: ISaveOptions, stat?: IFileStatWithMetadata): Promise<boolean>;
    revert(options?: IRevertOptions): Promise<void>;
    backup(token: CancellationToken): Promise<IWorkingCopyBackup>;
}
export declare function createFileStat(resource: URI, readonly?: boolean, isFile?: boolean, isDirectory?: boolean, isSymbolicLink?: boolean, children?: {
    resource: URI;
    isFile?: boolean;
    isDirectory?: boolean;
    isSymbolicLink?: boolean;
}[] | undefined): IFileStatWithMetadata;
export declare class TestWorkingCopyFileService implements IWorkingCopyFileService {
    readonly _serviceBrand: undefined;
    onWillRunWorkingCopyFileOperation: Event<WorkingCopyFileEvent>;
    onDidFailWorkingCopyFileOperation: Event<WorkingCopyFileEvent>;
    onDidRunWorkingCopyFileOperation: Event<WorkingCopyFileEvent>;
    addFileOperationParticipant(participant: IWorkingCopyFileOperationParticipant): IDisposable;
    readonly hasSaveParticipants = false;
    addSaveParticipant(participant: IStoredFileWorkingCopySaveParticipant): IDisposable;
    runSaveParticipants(workingCopy: IWorkingCopy, context: IStoredFileWorkingCopySaveParticipantContext, progress: IProgress<IProgressStep>, token: CancellationToken): Promise<void>;
    delete(operations: IDeleteOperation[], token: CancellationToken, undoInfo?: IFileOperationUndoRedoInfo): Promise<void>;
    registerWorkingCopyProvider(provider: (resourceOrFolder: URI) => IWorkingCopy[]): IDisposable;
    getDirty(resource: URI): IWorkingCopy[];
    create(operations: ICreateFileOperation[], token: CancellationToken, undoInfo?: IFileOperationUndoRedoInfo): Promise<IFileStatWithMetadata[]>;
    createFolder(operations: ICreateOperation[], token: CancellationToken, undoInfo?: IFileOperationUndoRedoInfo): Promise<IFileStatWithMetadata[]>;
    move(operations: IMoveOperation[], token: CancellationToken, undoInfo?: IFileOperationUndoRedoInfo): Promise<IFileStatWithMetadata[]>;
    copy(operations: ICopyOperation[], token: CancellationToken, undoInfo?: IFileOperationUndoRedoInfo): Promise<IFileStatWithMetadata[]>;
}
export declare function mock<T>(): Ctor<T>;
export interface Ctor<T> {
    new (): T;
}
export declare class TestExtensionService extends NullExtensionService {
}
export declare const TestProductService: {
    version: string;
    date?: string;
    quality?: string;
    commit?: string;
    nameShort: string;
    nameLong: string;
    win32AppUserModelId?: string;
    win32MutexName?: string;
    win32RegValueName?: string;
    applicationName: string;
    embedderIdentifier?: string;
    urlProtocol: string;
    dataFolderName: string;
    builtInExtensions?: import("../../../base/common/product.js").IBuiltInExtension[];
    walkthroughMetadata?: import("../../../base/common/product.js").IProductWalkthrough[];
    featuredExtensions?: import("../../../base/common/product.js").IFeaturedExtension[];
    downloadUrl?: string;
    updateUrl?: string;
    webUrl?: string;
    webEndpointUrlTemplate?: string;
    webviewContentExternalBaseUrlTemplate?: string;
    target?: string;
    nlsCoreBaseUrl?: string;
    settingsSearchBuildId?: number;
    settingsSearchUrl?: string;
    tasConfig?: {
        endpoint: string;
        telemetryEventName: string;
        assignmentContextTelemetryPropertyName: string;
    };
    extensionsGallery?: {
        readonly serviceUrl: string;
        readonly controlUrl: string;
        readonly extensionUrlTemplate: string;
        readonly resourceUrlTemplate: string;
        readonly nlsBaseUrl: string;
        readonly accessSKUs?: string[];
    };
    extensionPublisherOrgs?: readonly string[];
    trustedExtensionPublishers?: readonly string[];
    extensionRecommendations?: import("../../../base/common/collections.js").IStringDictionary<import("../../../base/common/product.js").IExtensionRecommendations>;
    configBasedExtensionTips?: import("../../../base/common/collections.js").IStringDictionary<import("../../../base/common/product.js").IConfigBasedExtensionTip>;
    exeBasedExtensionTips?: import("../../../base/common/collections.js").IStringDictionary<import("../../../base/common/product.js").IExeBasedExtensionTip>;
    remoteExtensionTips?: import("../../../base/common/collections.js").IStringDictionary<import("../../../base/common/product.js").IRemoteExtensionTip>;
    virtualWorkspaceExtensionTips?: import("../../../base/common/collections.js").IStringDictionary<import("../../../base/common/product.js").IVirtualWorkspaceExtensionTip>;
    extensionKeywords?: import("../../../base/common/collections.js").IStringDictionary<string[]>;
    keymapExtensionTips?: readonly string[];
    webExtensionTips?: readonly string[];
    languageExtensionTips?: readonly string[];
    trustedExtensionUrlPublicKeys?: import("../../../base/common/collections.js").IStringDictionary<string[]>;
    trustedExtensionAuthAccess?: string[] | import("../../../base/common/collections.js").IStringDictionary<string[]>;
    trustedMcpAuthAccess?: string[] | import("../../../base/common/collections.js").IStringDictionary<string[]>;
    inheritAuthAccountPreference?: import("../../../base/common/collections.js").IStringDictionary<string[]>;
    trustedExtensionProtocolHandlers?: readonly string[];
    commandPaletteSuggestedCommandIds?: string[];
    crashReporter?: {
        readonly companyName: string;
        readonly productName: string;
    };
    removeTelemetryMachineId?: boolean;
    enabledTelemetryLevels?: {
        error: boolean;
        usage: boolean;
    };
    enableTelemetry?: boolean;
    openToWelcomeMainPage?: boolean;
    aiConfig?: {
        readonly ariaKey: string;
    };
    documentationUrl?: string;
    serverDocumentationUrl?: string;
    releaseNotesUrl?: string;
    keyboardShortcutsUrlMac?: string;
    keyboardShortcutsUrlLinux?: string;
    keyboardShortcutsUrlWin?: string;
    introductoryVideosUrl?: string;
    tipsAndTricksUrl?: string;
    newsletterSignupUrl?: string;
    youTubeUrl?: string;
    requestFeatureUrl?: string;
    reportIssueUrl?: string;
    reportMarketplaceIssueUrl?: string;
    licenseUrl?: string;
    serverLicenseUrl?: string;
    privacyStatementUrl?: string;
    showTelemetryOptOut?: boolean;
    serverGreeting?: string[];
    serverLicense?: string[];
    serverLicensePrompt?: string;
    serverApplicationName: string;
    serverDataFolderName?: string;
    tunnelApplicationName?: string;
    tunnelApplicationConfig?: import("../../../base/common/product.js").ITunnelApplicationConfig;
    npsSurveyUrl?: string;
    surveys?: readonly import("../../../base/common/product.js").ISurveyData[];
    checksums?: {
        [path: string]: string;
    };
    checksumFailMoreInfoUrl?: string;
    appCenter?: import("../../../base/common/product.js").IAppCenterConfiguration;
    portable?: string;
    extensionKind?: {
        readonly [extensionId: string]: ("ui" | "workspace" | "web")[];
    };
    extensionPointExtensionKind?: {
        readonly [extensionPointId: string]: ("ui" | "workspace" | "web")[];
    };
    extensionSyncedKeys?: {
        readonly [extensionId: string]: string[];
    };
    extensionsEnabledWithApiProposalVersion?: string[];
    extensionEnabledApiProposals?: {
        readonly [extensionId: string]: string[];
    };
    extensionUntrustedWorkspaceSupport?: {
        readonly [extensionId: string]: import("../../../base/common/product.js").ExtensionUntrustedWorkspaceSupport;
    };
    extensionVirtualWorkspacesSupport?: {
        readonly [extensionId: string]: import("../../../base/common/product.js").ExtensionVirtualWorkspaceSupport;
    };
    extensionProperties: import("../../../base/common/collections.js").IStringDictionary<{
        readonly hasPrereleaseVersion?: boolean;
        readonly excludeVersionRange?: string;
    }>;
    msftInternalDomains?: string[];
    linkProtectionTrustedDomains?: readonly string[];
    defaultAccount?: {
        readonly authenticationProvider: {
            readonly id: string;
            readonly enterpriseProviderId: string;
            readonly enterpriseProviderConfig: string;
            readonly scopes: string[];
        };
        readonly tokenEntitlementUrl: string;
        readonly chatEntitlementUrl: string;
    };
    'configurationSync.store'?: import("../../../base/common/product.js").ConfigurationSyncStore;
    'editSessions.store'?: Omit<import("../../../base/common/product.js").ConfigurationSyncStore, "insidersUrl" | "stableUrl">;
    darwinUniversalAssetId?: string;
    darwinBundleIdentifier?: string;
    profileTemplatesUrl?: string;
    commonlyUsedSettings?: string[];
    aiGeneratedWorkspaceTrust?: import("../../../base/common/product.js").IAiGeneratedWorkspaceTrust;
    defaultChatAgent?: import("../../../base/common/product.js").IDefaultChatAgent;
    chatParticipantRegistry?: string;
    emergencyAlertUrl?: string;
    remoteDefaultExtensionsIfInstalledLocally?: string[];
    extensionConfigurationPolicy?: import("../../../base/common/collections.js").IStringDictionary<import("../../../base/common/policy.js").IPolicy>;
    _serviceBrand: undefined;
};
export declare class TestActivityService implements IActivityService {
    _serviceBrand: undefined;
    onDidChangeActivity: Event<any>;
    getViewContainerActivities(viewContainerId: string): IActivity[];
    getActivity(id: string): IActivity[];
    showViewContainerActivity(viewContainerId: string, badge: IActivity): IDisposable;
    showViewActivity(viewId: string, badge: IActivity): IDisposable;
    showAccountsActivity(activity: IActivity): IDisposable;
    showGlobalActivity(activity: IActivity): IDisposable;
    dispose(): void;
}
export declare const NullFilesConfigurationService: {
    _serviceBrand: undefined;
    readonly onDidChangeAutoSaveConfiguration: Event<any>;
    readonly onDidChangeAutoSaveDisabled: Event<any>;
    readonly onDidChangeReadonly: Event<any>;
    readonly onDidChangeFilesAssociation: Event<any>;
    readonly isHotExitEnabled: false;
    readonly hotExitConfiguration: undefined;
    getAutoSaveConfiguration(): IAutoSaveConfiguration;
    getAutoSaveMode(): IAutoSaveMode;
    hasShortAutoSaveDelay(): boolean;
    toggleAutoSave(): Promise<void>;
    enableAutoSaveAfterShortDelay(resourceOrEditor: URI | EditorInput): IDisposable;
    disableAutoSave(resourceOrEditor: URI | EditorInput): IDisposable;
    isReadonly(resource: URI, stat?: IBaseFileStat | undefined): boolean;
    updateReadonly(resource: URI, readonly: boolean | "toggle" | "reset"): Promise<void>;
    preventSaveConflicts(resource: URI, language?: string | undefined): boolean;
};
export declare class TestWorkspaceTrustEnablementService implements IWorkspaceTrustEnablementService {
    private isEnabled;
    _serviceBrand: undefined;
    constructor(isEnabled?: boolean);
    isWorkspaceTrustEnabled(): boolean;
}
export declare class TestWorkspaceTrustManagementService extends Disposable implements IWorkspaceTrustManagementService {
    private trusted;
    _serviceBrand: undefined;
    private _onDidChangeTrust;
    onDidChangeTrust: Event<boolean>;
    private _onDidChangeTrustedFolders;
    onDidChangeTrustedFolders: Event<void>;
    private _onDidInitiateWorkspaceTrustRequestOnStartup;
    onDidInitiateWorkspaceTrustRequestOnStartup: Event<void>;
    constructor(trusted?: boolean);
    get acceptsOutOfWorkspaceFiles(): boolean;
    set acceptsOutOfWorkspaceFiles(value: boolean);
    addWorkspaceTrustTransitionParticipant(participant: IWorkspaceTrustTransitionParticipant): IDisposable;
    getTrustedUris(): URI[];
    setParentFolderTrust(trusted: boolean): Promise<void>;
    getUriTrustInfo(uri: URI): Promise<IWorkspaceTrustUriInfo>;
    setTrustedUris(folders: URI[]): Promise<void>;
    setUrisTrust(uris: URI[], trusted: boolean): Promise<void>;
    canSetParentFolderTrust(): boolean;
    canSetWorkspaceTrust(): boolean;
    isWorkspaceTrusted(): boolean;
    isWorkspaceTrustForced(): boolean;
    get workspaceTrustInitialized(): Promise<void>;
    get workspaceResolved(): Promise<void>;
    setWorkspaceTrust(trusted: boolean): Promise<void>;
}
export declare class TestWorkspaceTrustRequestService extends Disposable implements IWorkspaceTrustRequestService {
    private readonly _trusted;
    _serviceBrand: any;
    private readonly _onDidInitiateOpenFilesTrustRequest;
    readonly onDidInitiateOpenFilesTrustRequest: Event<void>;
    private readonly _onDidInitiateWorkspaceTrustRequest;
    readonly onDidInitiateWorkspaceTrustRequest: Event<WorkspaceTrustRequestOptions>;
    private readonly _onDidInitiateWorkspaceTrustRequestOnStartup;
    readonly onDidInitiateWorkspaceTrustRequestOnStartup: Event<void>;
    constructor(_trusted: boolean);
    requestOpenUrisHandler: (uris: URI[]) => Promise<WorkspaceTrustUriResponse>;
    requestOpenFilesTrust(uris: URI[]): Promise<WorkspaceTrustUriResponse>;
    completeOpenFilesTrustRequest(result: WorkspaceTrustUriResponse, saveResponse: boolean): Promise<void>;
    cancelWorkspaceTrustRequest(): void;
    completeWorkspaceTrustRequest(trusted?: boolean): Promise<void>;
    requestWorkspaceTrust(options?: WorkspaceTrustRequestOptions): Promise<boolean>;
    requestWorkspaceTrustOnStartup(): void;
}
export declare class TestMarkerService implements IMarkerService {
    _serviceBrand: undefined;
    onMarkerChanged: Event<any>;
    getStatistics(): MarkerStatistics;
    changeOne(owner: string, resource: URI, markers: IMarkerData[]): void;
    changeAll(owner: string, data: IResourceMarker[]): void;
    remove(owner: string, resources: URI[]): void;
    read(filter?: {
        owner?: string | undefined;
        resource?: URI | undefined;
        severities?: number | undefined;
        take?: number | undefined;
    } | undefined): IMarker[];
    installResourceFilter(resource: URI, reason: string): IDisposable;
}
