import { FileEditorInput } from '../../contrib/files/browser/editors/fileEditorInput.js';
import { TestInstantiationService } from '../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { URI } from '../../../base/common/uri.js';
import { ITelemetryData, TelemetryLevel } from '../../../platform/telemetry/common/telemetry.js';
import { EditorInput } from '../../common/editor/editorInput.js';
import { EditorInputWithOptions, IEditorIdentifier, IUntitledTextResourceEditorInput, IResourceDiffEditorInput, IEditorPane, IEditorCloseEvent, IEditorPartOptions, IRevertOptions, GroupIdentifier, EditorsOrder, IFileEditorInput, ISaveOptions, IMoveResult, ITextDiffEditorPane, IVisibleEditorPane, EditorInputCapabilities, IUntypedEditorInput, IEditorWillMoveEvent, IEditorWillOpenEvent, IActiveEditorChangeEvent, EditorPaneSelectionChangeReason, IEditorPaneSelection, IToolbarActions } from '../../common/editor.js';
import { EditorServiceImpl, IEditorGroupView, IEditorGroupsView, IEditorGroupTitleHeight } from '../../browser/parts/editor/editor.js';
import { Event, Emitter } from '../../../base/common/event.js';
import { IResolvedWorkingCopyBackup, IWorkingCopyBackupService } from '../../services/workingCopy/common/workingCopyBackup.js';
import { ConfigurationTarget, IConfigurationValue } from '../../../platform/configuration/common/configuration.js';
import { IWorkbenchLayoutService, PanelAlignment, Parts, Position as PartPosition } from '../../services/layout/browser/layoutService.js';
import { ITextModelService } from '../../../editor/common/services/resolverService.js';
import { IEditorOptions, IResourceEditorInput, IResourceEditorInputIdentifier, ITextResourceEditorInput } from '../../../platform/editor/common/editor.js';
import { IUntitledTextEditorModelManager, UntitledTextEditorService } from '../../services/untitled/common/untitledTextEditorService.js';
import { IWorkspaceIdentifier } from '../../../platform/workspace/common/workspace.js';
import { ILifecycleService, ShutdownReason, StartupKind, LifecyclePhase, WillShutdownEvent, BeforeShutdownErrorEvent, InternalBeforeShutdownEvent, IWillShutdownEventJoiner } from '../../services/lifecycle/common/lifecycle.js';
import { FileOperationEvent, IFileService, IFileStat, IFileStatResult, FileChangesEvent, IResolveFileOptions, ICreateFileOptions, IFileSystemProvider, FileSystemProviderCapabilities, IFileChange, IWatchOptions, IStat, FileType, IFileDeleteOptions, IFileOverwriteOptions, IFileWriteOptions, IFileOpenOptions, IFileStatWithMetadata, IResolveMetadataFileOptions, IWriteFileOptions, IReadFileOptions, IFileContent, IFileStreamContent, FileOperationError, IFileSystemProviderWithFileReadStreamCapability, IFileReadStreamOptions, IReadFileStreamOptions, IFileSystemProviderCapabilitiesChangeEvent, IFileStatWithPartialMetadata, IFileSystemWatcher, IWatchOptionsWithCorrelation, IFileSystemProviderActivationEvent } from '../../../platform/files/common/files.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { ModelService } from '../../../editor/common/services/modelService.js';
import { IResourceEncoding, ITextFileService, IReadTextFileOptions, ITextFileStreamContent, IWriteTextFileOptions, ITextFileEditorModelManager } from '../../services/textfile/common/textfiles.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { IInstantiationService, ServiceIdentifier } from '../../../platform/instantiation/common/instantiation.js';
import { TestConfigurationService } from '../../../platform/configuration/test/common/testConfigurationService.js';
import { MenuBarVisibility, IWindowOpenable, IOpenWindowOptions, IOpenEmptyWindowOptions, IRectangle } from '../../../platform/window/common/window.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { ITextResourceConfigurationService } from '../../../editor/common/services/textResourceConfiguration.js';
import { IPosition } from '../../../editor/common/core/position.js';
import { IMenuService, MenuId, IMenu, IMenuChangeEvent, IMenuActionOptions, MenuItemAction, SubmenuItemAction } from '../../../platform/actions/common/actions.js';
import { ContextKeyValue, IContextKeyService } from '../../../platform/contextkey/common/contextkey.js';
import { ITextBufferFactory, ITextSnapshot } from '../../../editor/common/model.js';
import { IDialogService, IPickAndOpenOptions, ISaveDialogOptions, IOpenDialogOptions, IFileDialogService, ConfirmResult } from '../../../platform/dialogs/common/dialogs.js';
import { INotificationService } from '../../../platform/notification/common/notification.js';
import { IDecorationsService, IResourceDecorationChangeEvent, IDecoration, IDecorationData, IDecorationsProvider } from '../../services/decorations/common/decorations.js';
import { IDisposable, Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { IEditorGroupsService, IEditorGroup, GroupsOrder, GroupsArrangement, GroupDirection, IMergeGroupOptions, IEditorReplacement, IFindGroupScope, EditorGroupLayout, ICloseEditorOptions, GroupOrientation, ICloseAllEditorsOptions, ICloseEditorsFilter, IEditorDropTargetDelegate, IEditorPart, IAuxiliaryEditorPart, IEditorGroupsContainer, IEditorWorkingSet, IEditorGroupContextKeyProvider, IEditorWorkingSetOptions } from '../../services/editor/common/editorGroupsService.js';
import { IEditorService, ISaveEditorsOptions, IRevertAllEditorsOptions, PreferredGroup, IEditorsChangeEvent, ISaveEditorsResult } from '../../services/editor/common/editorService.js';
import { ICodeEditorService } from '../../../editor/browser/services/codeEditorService.js';
import { IDimension } from '../../../base/browser/dom.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { ILabelService } from '../../../platform/label/common/label.js';
import { PaneCompositeDescriptor } from '../../browser/panecomposite.js';
import { IProcessEnvironment, OperatingSystem } from '../../../base/common/platform.js';
import { Part } from '../../browser/part.js';
import { VSBuffer, VSBufferReadable, VSBufferReadableStream } from '../../../base/common/buffer.js';
import { IProductService } from '../../../platform/product/common/productService.js';
import { IHostService } from '../../services/host/browser/host.js';
import { WorkingCopyService } from '../../services/workingCopy/common/workingCopyService.js';
import { IWorkingCopy, IWorkingCopyBackupMeta, IWorkingCopyIdentifier } from '../../services/workingCopy/common/workingCopy.js';
import { IFilesConfigurationService, FilesConfigurationService } from '../../services/filesConfiguration/common/filesConfigurationService.js';
import { BrowserWorkbenchEnvironmentService } from '../../services/environment/browser/environmentService.js';
import { BrowserTextFileService } from '../../services/textfile/browser/browserTextFileService.js';
import { IWorkbenchEnvironmentService } from '../../services/environment/common/environmentService.js';
import { IPathService } from '../../services/path/common/pathService.js';
import { Direction, IViewSize } from '../../../base/browser/ui/grid/grid.js';
import { IProgressService, IProgressOptions, IProgressWindowOptions, IProgressNotificationOptions, IProgressCompositeOptions, IProgress, IProgressStep, IProgressDialogOptions, IProgressIndicator } from '../../../platform/progress/common/progress.js';
import { IWorkingCopyFileService } from '../../services/workingCopy/common/workingCopyFileService.js';
import { TextFileEditorModel } from '../../services/textfile/common/textFileEditorModel.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { TestDialogService } from '../../../platform/dialogs/test/common/testDialogService.js';
import { MainEditorPart } from '../../browser/parts/editor/editorPart.js';
import { ICodeEditor } from '../../../editor/browser/editorBrowser.js';
import { IDiffEditor, IEditor } from '../../../editor/common/editorCommon.js';
import { IInputBox, IInputOptions, IPickOptions, IQuickInputButton, IQuickInputService, IQuickNavigateConfiguration, IQuickPick, IQuickPickItem, IQuickWidget, QuickPickInput } from '../../../platform/quickinput/common/quickInput.js';
import { IListService } from '../../../platform/list/browser/listService.js';
import { TestContextService, TestWorkspaceTrustRequestService } from '../common/workbenchTestServices.js';
import { IView, IViewDescriptor, ViewContainer, ViewContainerLocation } from '../../common/views.js';
import { IViewsService } from '../../services/views/common/viewsService.js';
import { IPaneComposite } from '../../common/panecomposite.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
import { InMemoryFileSystemProvider } from '../../../platform/files/common/inMemoryFilesystemProvider.js';
import { ReadableStreamEvents } from '../../../base/common/stream.js';
import { EncodingOracle, IEncodingOverride } from '../../services/textfile/browser/textFileService.js';
import { ColorScheme } from '../../../platform/theme/common/theme.js';
import { InMemoryWorkingCopyBackupService } from '../../services/workingCopy/common/workingCopyBackupService.js';
import { BrowserWorkingCopyBackupService } from '../../services/workingCopy/browser/workingCopyBackupService.js';
import { TextResourceEditor } from '../../browser/parts/editor/textResourceEditor.js';
import { TextFileEditor } from '../../contrib/files/browser/editors/textFileEditor.js';
import { IEnterWorkspaceResult, IRecent, IRecentlyOpened, IWorkspaceFolderCreationData, IWorkspacesService } from '../../../platform/workspaces/common/workspaces.js';
import { IExtensionTerminalProfile, IShellLaunchConfig, ITerminalBackend, ITerminalProfile, TerminalIcon, TerminalLocation, TerminalShellType } from '../../../platform/terminal/common/terminal.js';
import { ICreateTerminalOptions, IDeserializedTerminalEditorInput, ITerminalEditorService, ITerminalGroup, ITerminalGroupService, ITerminalInstance, ITerminalInstanceService, TerminalEditorLocation } from '../../contrib/terminal/browser/terminal.js';
import { IRegisterContributedProfileArgs, IShellLaunchConfigResolveOptions, ITerminalProfileProvider, ITerminalProfileResolverService, ITerminalProfileService, type ITerminalConfiguration } from '../../contrib/terminal/common/terminal.js';
import { IEditorResolverService } from '../../services/editor/common/editorResolverService.js';
import { IWorkingCopyEditorService } from '../../services/workingCopy/common/workingCopyEditorService.js';
import { IElevatedFileService } from '../../services/files/common/elevatedFileService.js';
import { ResourceMap } from '../../../base/common/map.js';
import { ITextEditorService } from '../../services/textfile/common/textEditorService.js';
import { IPaneCompositePartService } from '../../services/panecomposite/browser/panecomposite.js';
import { IPaneCompositePart } from '../../browser/parts/paneCompositePart.js';
import { TerminalEditorInput } from '../../contrib/terminal/browser/terminalEditorInput.js';
import { IGroupModelChangeEvent } from '../../common/editor/editorGroupModel.js';
import { Selection } from '../../../editor/common/core/selection.js';
import { IFolderBackupInfo, IWorkspaceBackupInfo } from '../../../platform/backup/common/backup.js';
import { IExtensionHostExitInfo, IRemoteAgentConnection, IRemoteAgentService } from '../../services/remote/common/remoteAgentService.js';
import { IDiagnosticInfoOptions, IDiagnosticInfo } from '../../../platform/diagnostics/common/diagnostics.js';
import { ExtensionType, IExtension, IExtensionDescription, IRelaxedExtensionManifest, TargetPlatform } from '../../../platform/extensions/common/extensions.js';
import { IRemoteAgentEnvironment } from '../../../platform/remote/common/remoteAgentEnvironment.js';
import { ILayoutOffsetInfo } from '../../../platform/layout/browser/layoutService.js';
import { IUserDataProfile } from '../../../platform/userDataProfile/common/userDataProfile.js';
import { IUserDataProfileService } from '../../services/userDataProfile/common/userDataProfile.js';
import { EnablementState, IExtensionManagementServer, IResourceExtension, IScannedExtension, IWebExtensionsScannerService, IWorkbenchExtensionEnablementService, IWorkbenchExtensionManagementService } from '../../services/extensionManagement/common/extensionManagement.js';
import { ILocalExtension, IGalleryExtension, InstallOptions, UninstallOptions, IExtensionsControlManifest, IGalleryMetadata, IExtensionManagementParticipant, Metadata, InstallExtensionResult, InstallExtensionInfo, UninstallExtensionInfo, InstallExtensionSummary } from '../../../platform/extensionManagement/common/extensionManagement.js';
import { IRemoteExtensionsScannerService } from '../../../platform/remote/common/remoteExtensionsScanner.js';
import { EditorParts } from '../../browser/parts/editor/editorParts.js';
import { IEditorPaneService } from '../../services/editor/common/editorPaneService.js';
import { TerminalConfigurationService } from '../../contrib/terminal/browser/terminalConfigurationService.js';
import { IMarkdownString } from '../../../base/common/htmlContent.js';
export declare function createFileEditorInput(instantiationService: IInstantiationService, resource: URI): FileEditorInput;
export declare class TestTextResourceEditor extends TextResourceEditor {
    protected createEditorControl(parent: HTMLElement, configuration: any): void;
}
export declare class TestTextFileEditor extends TextFileEditor {
    protected createEditorControl(parent: HTMLElement, configuration: any): void;
    setSelection(selection: Selection | undefined, reason: EditorPaneSelectionChangeReason): void;
    getSelection(): IEditorPaneSelection | undefined;
}
export interface ITestInstantiationService extends IInstantiationService {
    stub<T>(service: ServiceIdentifier<T>, ctor: any): T;
}
export declare class TestWorkingCopyService extends WorkingCopyService {
    testUnregisterWorkingCopy(workingCopy: IWorkingCopy): void;
}
export declare function workbenchInstantiationService(overrides?: {
    environmentService?: (instantiationService: IInstantiationService) => IEnvironmentService;
    fileService?: (instantiationService: IInstantiationService) => IFileService;
    workingCopyBackupService?: (instantiationService: IInstantiationService) => IWorkingCopyBackupService;
    configurationService?: (instantiationService: IInstantiationService) => TestConfigurationService;
    textFileService?: (instantiationService: IInstantiationService) => ITextFileService;
    pathService?: (instantiationService: IInstantiationService) => IPathService;
    editorService?: (instantiationService: IInstantiationService) => IEditorService;
    contextKeyService?: (instantiationService: IInstantiationService) => IContextKeyService;
    textEditorService?: (instantiationService: IInstantiationService) => ITextEditorService;
}, disposables?: Pick<DisposableStore, 'add'>): TestInstantiationService;
export declare class TestServiceAccessor {
    lifecycleService: TestLifecycleService;
    textFileService: TestTextFileService;
    textEditorService: ITextEditorService;
    workingCopyFileService: IWorkingCopyFileService;
    filesConfigurationService: TestFilesConfigurationService;
    contextService: TestContextService;
    modelService: ModelService;
    fileService: TestFileService;
    fileDialogService: TestFileDialogService;
    dialogService: TestDialogService;
    workingCopyService: TestWorkingCopyService;
    editorService: TestEditorService;
    editorPaneService: IEditorPaneService;
    environmentService: IWorkbenchEnvironmentService;
    pathService: IPathService;
    editorGroupService: IEditorGroupsService;
    editorResolverService: IEditorResolverService;
    languageService: ILanguageService;
    textModelResolverService: ITextModelService;
    untitledTextEditorService: UntitledTextEditorService;
    testConfigurationService: TestConfigurationService;
    workingCopyBackupService: TestWorkingCopyBackupService;
    hostService: TestHostService;
    quickInputService: IQuickInputService;
    labelService: ILabelService;
    logService: ILogService;
    uriIdentityService: IUriIdentityService;
    instantitionService: IInstantiationService;
    notificationService: INotificationService;
    workingCopyEditorService: IWorkingCopyEditorService;
    instantiationService: IInstantiationService;
    elevatedFileService: IElevatedFileService;
    workspaceTrustRequestService: TestWorkspaceTrustRequestService;
    decorationsService: IDecorationsService;
    progressService: IProgressService;
    constructor(lifecycleService: TestLifecycleService, textFileService: TestTextFileService, textEditorService: ITextEditorService, workingCopyFileService: IWorkingCopyFileService, filesConfigurationService: TestFilesConfigurationService, contextService: TestContextService, modelService: ModelService, fileService: TestFileService, fileDialogService: TestFileDialogService, dialogService: TestDialogService, workingCopyService: TestWorkingCopyService, editorService: TestEditorService, editorPaneService: IEditorPaneService, environmentService: IWorkbenchEnvironmentService, pathService: IPathService, editorGroupService: IEditorGroupsService, editorResolverService: IEditorResolverService, languageService: ILanguageService, textModelResolverService: ITextModelService, untitledTextEditorService: UntitledTextEditorService, testConfigurationService: TestConfigurationService, workingCopyBackupService: TestWorkingCopyBackupService, hostService: TestHostService, quickInputService: IQuickInputService, labelService: ILabelService, logService: ILogService, uriIdentityService: IUriIdentityService, instantitionService: IInstantiationService, notificationService: INotificationService, workingCopyEditorService: IWorkingCopyEditorService, instantiationService: IInstantiationService, elevatedFileService: IElevatedFileService, workspaceTrustRequestService: TestWorkspaceTrustRequestService, decorationsService: IDecorationsService, progressService: IProgressService);
}
export declare class TestTextFileService extends BrowserTextFileService {
    private readStreamError;
    private writeError;
    constructor(fileService: IFileService, untitledTextEditorService: IUntitledTextEditorModelManager, lifecycleService: ILifecycleService, instantiationService: IInstantiationService, modelService: IModelService, environmentService: IWorkbenchEnvironmentService, dialogService: IDialogService, fileDialogService: IFileDialogService, textResourceConfigurationService: ITextResourceConfigurationService, filesConfigurationService: IFilesConfigurationService, codeEditorService: ICodeEditorService, pathService: IPathService, workingCopyFileService: IWorkingCopyFileService, uriIdentityService: IUriIdentityService, languageService: ILanguageService, logService: ILogService, elevatedFileService: IElevatedFileService, decorationsService: IDecorationsService);
    setReadStreamErrorOnce(error: FileOperationError): void;
    readStream(resource: URI, options?: IReadTextFileOptions): Promise<ITextFileStreamContent>;
    setWriteErrorOnce(error: FileOperationError): void;
    write(resource: URI, value: string | ITextSnapshot, options?: IWriteTextFileOptions): Promise<IFileStatWithMetadata>;
}
export declare class TestBrowserTextFileServiceWithEncodingOverrides extends BrowserTextFileService {
    private _testEncoding;
    get encoding(): TestEncodingOracle;
}
export declare class TestEncodingOracle extends EncodingOracle {
    protected get encodingOverrides(): IEncodingOverride[];
    protected set encodingOverrides(overrides: IEncodingOverride[]);
}
declare class TestEnvironmentServiceWithArgs extends BrowserWorkbenchEnvironmentService {
    args: never[];
}
export declare const TestEnvironmentService: TestEnvironmentServiceWithArgs;
export declare class TestProgressService implements IProgressService {
    readonly _serviceBrand: undefined;
    withProgress(options: IProgressOptions | IProgressDialogOptions | IProgressWindowOptions | IProgressNotificationOptions | IProgressCompositeOptions, task: (progress: IProgress<IProgressStep>) => Promise<any>, onDidCancel?: ((choice?: number | undefined) => void) | undefined): Promise<any>;
}
export declare class TestDecorationsService implements IDecorationsService {
    readonly _serviceBrand: undefined;
    onDidChangeDecorations: Event<IResourceDecorationChangeEvent>;
    registerDecorationsProvider(_provider: IDecorationsProvider): IDisposable;
    getDecoration(_uri: URI, _includeChildren: boolean, _overwrite?: IDecorationData): IDecoration | undefined;
}
export declare class TestMenuService implements IMenuService {
    readonly _serviceBrand: undefined;
    createMenu(_id: MenuId, _scopedKeybindingService: IContextKeyService): IMenu;
    getMenuActions(id: MenuId, contextKeyService: IContextKeyService, options?: IMenuActionOptions): [string, Array<MenuItemAction | SubmenuItemAction>][];
    getMenuContexts(id: MenuId): ReadonlySet<string>;
    resetHiddenStates(): void;
}
export declare class TestFileDialogService implements IFileDialogService {
    private readonly pathService;
    readonly _serviceBrand: undefined;
    private confirmResult;
    constructor(pathService: IPathService);
    defaultFilePath(_schemeFilter?: string): Promise<URI>;
    defaultFolderPath(_schemeFilter?: string): Promise<URI>;
    defaultWorkspacePath(_schemeFilter?: string): Promise<URI>;
    preferredHome(_schemeFilter?: string): Promise<URI>;
    pickFileFolderAndOpen(_options: IPickAndOpenOptions): Promise<any>;
    pickFileAndOpen(_options: IPickAndOpenOptions): Promise<any>;
    pickFolderAndOpen(_options: IPickAndOpenOptions): Promise<any>;
    pickWorkspaceAndOpen(_options: IPickAndOpenOptions): Promise<any>;
    private fileToSave;
    setPickFileToSave(path: URI): void;
    pickFileToSave(defaultUri: URI, availableFileSystems?: string[]): Promise<URI | undefined>;
    showSaveDialog(_options: ISaveDialogOptions): Promise<URI | undefined>;
    showOpenDialog(_options: IOpenDialogOptions): Promise<URI[] | undefined>;
    setConfirmResult(result: ConfirmResult): void;
    showSaveConfirm(fileNamesOrResources: (string | URI)[]): Promise<ConfirmResult>;
}
export declare class TestLayoutService implements IWorkbenchLayoutService {
    readonly _serviceBrand: undefined;
    openedDefaultEditors: boolean;
    mainContainerDimension: IDimension;
    activeContainerDimension: IDimension;
    mainContainerOffset: ILayoutOffsetInfo;
    activeContainerOffset: ILayoutOffsetInfo;
    mainContainer: HTMLElement;
    containers: HTMLElement[];
    activeContainer: HTMLElement;
    onDidChangeZenMode: Event<boolean>;
    onDidChangeMainEditorCenteredLayout: Event<boolean>;
    onDidChangeWindowMaximized: Event<{
        windowId: number;
        maximized: boolean;
    }>;
    onDidChangePanelPosition: Event<string>;
    onDidChangePanelAlignment: Event<PanelAlignment>;
    onDidChangePartVisibility: Event<void>;
    onDidLayoutMainContainer: Event<any>;
    onDidLayoutActiveContainer: Event<any>;
    onDidLayoutContainer: Event<any>;
    onDidChangeNotificationsVisibility: Event<any>;
    onDidAddContainer: Event<any>;
    onDidChangeActiveContainer: Event<any>;
    layout(): void;
    isRestored(): boolean;
    whenReady: Promise<void>;
    whenRestored: Promise<void>;
    hasFocus(_part: Parts): boolean;
    focusPart(_part: Parts): void;
    hasMainWindowBorder(): boolean;
    getMainWindowBorderRadius(): string | undefined;
    isVisible(_part: Parts): boolean;
    getContainer(): HTMLElement;
    whenContainerStylesLoaded(): undefined;
    isTitleBarHidden(): boolean;
    isStatusBarHidden(): boolean;
    isActivityBarHidden(): boolean;
    setActivityBarHidden(_hidden: boolean): void;
    setBannerHidden(_hidden: boolean): void;
    isSideBarHidden(): boolean;
    setEditorHidden(_hidden: boolean): Promise<void>;
    setSideBarHidden(_hidden: boolean): Promise<void>;
    setAuxiliaryBarHidden(_hidden: boolean): Promise<void>;
    setPartHidden(_hidden: boolean, part: Parts): Promise<void>;
    isPanelHidden(): boolean;
    setPanelHidden(_hidden: boolean): Promise<void>;
    toggleMaximizedPanel(): void;
    isPanelMaximized(): boolean;
    getMenubarVisibility(): MenuBarVisibility;
    toggleMenuBar(): void;
    getSideBarPosition(): number;
    getPanelPosition(): number;
    getPanelAlignment(): PanelAlignment;
    setPanelPosition(_position: PartPosition): Promise<void>;
    setPanelAlignment(_alignment: PanelAlignment): Promise<void>;
    addClass(_clazz: string): void;
    removeClass(_clazz: string): void;
    getMaximumEditorDimensions(): IDimension;
    toggleZenMode(): void;
    isMainEditorLayoutCentered(): boolean;
    centerMainEditorLayout(_active: boolean): void;
    resizePart(_part: Parts, _sizeChangeWidth: number, _sizeChangeHeight: number): void;
    getSize(part: Parts): IViewSize;
    setSize(part: Parts, size: IViewSize): void;
    registerPart(part: Part): IDisposable;
    isWindowMaximized(targetWindow: Window): boolean;
    updateWindowMaximizedState(targetWindow: Window, maximized: boolean): void;
    getVisibleNeighborPart(part: Parts, direction: Direction): Parts | undefined;
    focus(): void;
}
export declare class TestPaneCompositeService extends Disposable implements IPaneCompositePartService {
    readonly _serviceBrand: undefined;
    onDidPaneCompositeOpen: Event<{
        composite: IPaneComposite;
        viewContainerLocation: ViewContainerLocation;
    }>;
    onDidPaneCompositeClose: Event<{
        composite: IPaneComposite;
        viewContainerLocation: ViewContainerLocation;
    }>;
    private parts;
    constructor();
    openPaneComposite(id: string | undefined, viewContainerLocation: ViewContainerLocation, focus?: boolean): Promise<IPaneComposite | undefined>;
    getActivePaneComposite(viewContainerLocation: ViewContainerLocation): IPaneComposite | undefined;
    getPaneComposite(id: string, viewContainerLocation: ViewContainerLocation): PaneCompositeDescriptor | undefined;
    getPaneComposites(viewContainerLocation: ViewContainerLocation): PaneCompositeDescriptor[];
    getProgressIndicator(id: string, viewContainerLocation: ViewContainerLocation): IProgressIndicator | undefined;
    hideActivePaneComposite(viewContainerLocation: ViewContainerLocation): void;
    getLastActivePaneCompositeId(viewContainerLocation: ViewContainerLocation): string;
    getPinnedPaneCompositeIds(viewContainerLocation: ViewContainerLocation): string[];
    getVisiblePaneCompositeIds(viewContainerLocation: ViewContainerLocation): string[];
    getPaneCompositeIds(viewContainerLocation: ViewContainerLocation): string[];
    getPartByLocation(viewContainerLocation: ViewContainerLocation): IPaneCompositePart;
}
export declare class TestSideBarPart implements IPaneCompositePart {
    readonly _serviceBrand: undefined;
    onDidViewletRegisterEmitter: Emitter<PaneCompositeDescriptor>;
    onDidViewletDeregisterEmitter: Emitter<PaneCompositeDescriptor>;
    onDidViewletOpenEmitter: Emitter<IPaneComposite>;
    onDidViewletCloseEmitter: Emitter<IPaneComposite>;
    readonly partId = Parts.SIDEBAR_PART;
    element: HTMLElement;
    minimumWidth: number;
    maximumWidth: number;
    minimumHeight: number;
    maximumHeight: number;
    onDidChange: Event<any>;
    onDidPaneCompositeOpen: Event<IPaneComposite>;
    onDidPaneCompositeClose: Event<IPaneComposite>;
    openPaneComposite(id: string, focus?: boolean): Promise<IPaneComposite | undefined>;
    getPaneComposites(): PaneCompositeDescriptor[];
    getAllViewlets(): PaneCompositeDescriptor[];
    getActivePaneComposite(): IPaneComposite;
    getDefaultViewletId(): string;
    getPaneComposite(id: string): PaneCompositeDescriptor | undefined;
    getProgressIndicator(id: string): undefined;
    hideActivePaneComposite(): void;
    getLastActivePaneCompositeId(): string;
    dispose(): void;
    getPinnedPaneCompositeIds(): never[];
    getVisiblePaneCompositeIds(): never[];
    getPaneCompositeIds(): never[];
    layout(width: number, height: number, top: number, left: number): void;
}
export declare class TestPanelPart implements IPaneCompositePart {
    readonly _serviceBrand: undefined;
    element: HTMLElement;
    minimumWidth: number;
    maximumWidth: number;
    minimumHeight: number;
    maximumHeight: number;
    onDidChange: Event<any>;
    onDidPaneCompositeOpen: Event<IPaneComposite>;
    onDidPaneCompositeClose: Event<IPaneComposite>;
    readonly partId = Parts.AUXILIARYBAR_PART;
    openPaneComposite(id?: string, focus?: boolean): Promise<undefined>;
    getPaneComposite(id: string): any;
    getPaneComposites(): never[];
    getPinnedPaneCompositeIds(): never[];
    getVisiblePaneCompositeIds(): never[];
    getPaneCompositeIds(): never[];
    getActivePaneComposite(): IPaneComposite;
    setPanelEnablement(id: string, enabled: boolean): void;
    dispose(): void;
    getProgressIndicator(id: string): never;
    hideActivePaneComposite(): void;
    getLastActivePaneCompositeId(): string;
    layout(width: number, height: number, top: number, left: number): void;
}
export declare class TestViewsService implements IViewsService {
    readonly _serviceBrand: undefined;
    onDidChangeViewContainerVisibility: Event<{
        id: string;
        visible: boolean;
        location: ViewContainerLocation;
    }>;
    isViewContainerVisible(id: string): boolean;
    isViewContainerActive(id: string): boolean;
    getVisibleViewContainer(): ViewContainer | null;
    openViewContainer(id: string, focus?: boolean): Promise<IPaneComposite | null>;
    closeViewContainer(id: string): void;
    onDidChangeViewVisibilityEmitter: Emitter<{
        id: string;
        visible: boolean;
    }>;
    onDidChangeViewVisibility: Event<{
        id: string;
        visible: boolean;
    }>;
    onDidChangeFocusedViewEmitter: Emitter<void>;
    onDidChangeFocusedView: Event<void>;
    isViewVisible(id: string): boolean;
    getActiveViewWithId<T extends IView>(id: string): T | null;
    getViewWithId<T extends IView>(id: string): T | null;
    openView<T extends IView>(id: string, focus?: boolean | undefined): Promise<T | null>;
    closeView(id: string): void;
    getViewProgressIndicator(id: string): never;
    getActiveViewPaneContainerWithId(id: string): null;
    getFocusedViewName(): string;
    getFocusedView(): IViewDescriptor | null;
}
export declare class TestEditorGroupsService implements IEditorGroupsService {
    groups: TestEditorGroupView[];
    readonly _serviceBrand: undefined;
    constructor(groups?: TestEditorGroupView[]);
    readonly parts: readonly IEditorPart[];
    windowId: number;
    onDidCreateAuxiliaryEditorPart: Event<IAuxiliaryEditorPart>;
    onDidChangeActiveGroup: Event<IEditorGroup>;
    onDidActivateGroup: Event<IEditorGroup>;
    onDidAddGroup: Event<IEditorGroup>;
    onDidRemoveGroup: Event<IEditorGroup>;
    onDidMoveGroup: Event<IEditorGroup>;
    onDidChangeGroupIndex: Event<IEditorGroup>;
    onDidChangeGroupLabel: Event<IEditorGroup>;
    onDidChangeGroupLocked: Event<IEditorGroup>;
    onDidChangeGroupMaximized: Event<boolean>;
    onDidLayout: Event<IDimension>;
    onDidChangeEditorPartOptions: Event<any>;
    onDidScroll: Event<any>;
    onWillDispose: Event<any>;
    orientation: GroupOrientation;
    isReady: boolean;
    whenReady: Promise<void>;
    whenRestored: Promise<void>;
    hasRestorableState: boolean;
    contentDimension: {
        width: number;
        height: number;
    };
    get activeGroup(): IEditorGroup;
    get sideGroup(): IEditorGroup;
    get count(): number;
    getPart(group: number | IEditorGroup): IEditorPart;
    saveWorkingSet(name: string): IEditorWorkingSet;
    getWorkingSets(): IEditorWorkingSet[];
    applyWorkingSet(workingSet: IEditorWorkingSet | 'empty', options?: IEditorWorkingSetOptions): Promise<boolean>;
    deleteWorkingSet(workingSet: IEditorWorkingSet): Promise<boolean>;
    getGroups(_order?: GroupsOrder): readonly IEditorGroup[];
    getGroup(identifier: number): IEditorGroup | undefined;
    getLabel(_identifier: number): string;
    findGroup(_scope: IFindGroupScope, _source?: number | IEditorGroup, _wrap?: boolean): IEditorGroup;
    activateGroup(_group: number | IEditorGroup): IEditorGroup;
    restoreGroup(_group: number | IEditorGroup): IEditorGroup;
    getSize(_group: number | IEditorGroup): {
        width: number;
        height: number;
    };
    setSize(_group: number | IEditorGroup, _size: {
        width: number;
        height: number;
    }): void;
    arrangeGroups(_arrangement: GroupsArrangement): void;
    toggleMaximizeGroup(): void;
    hasMaximizedGroup(): boolean;
    toggleExpandGroup(): void;
    applyLayout(_layout: EditorGroupLayout): void;
    getLayout(): EditorGroupLayout;
    setGroupOrientation(_orientation: GroupOrientation): void;
    addGroup(_location: number | IEditorGroup, _direction: GroupDirection): IEditorGroup;
    removeGroup(_group: number | IEditorGroup): void;
    moveGroup(_group: number | IEditorGroup, _location: number | IEditorGroup, _direction: GroupDirection): IEditorGroup;
    mergeGroup(_group: number | IEditorGroup, _target: number | IEditorGroup, _options?: IMergeGroupOptions): boolean;
    mergeAllGroups(_group: number | IEditorGroup, _options?: IMergeGroupOptions): boolean;
    copyGroup(_group: number | IEditorGroup, _location: number | IEditorGroup, _direction: GroupDirection): IEditorGroup;
    centerLayout(active: boolean): void;
    isLayoutCentered(): boolean;
    createEditorDropTarget(container: HTMLElement, delegate: IEditorDropTargetDelegate): IDisposable;
    registerContextKeyProvider<T extends ContextKeyValue>(_provider: IEditorGroupContextKeyProvider<T>): IDisposable;
    getScopedInstantiationService(part: IEditorPart): IInstantiationService;
    partOptions: IEditorPartOptions;
    enforcePartOptions(options: IEditorPartOptions): IDisposable;
    readonly mainPart: this;
    registerEditorPart(part: any): IDisposable;
    createAuxiliaryEditorPart(): Promise<IAuxiliaryEditorPart>;
}
export declare class TestEditorGroupView implements IEditorGroupView {
    id: number;
    constructor(id: number);
    windowId: number;
    groupsView: IEditorGroupsView;
    activeEditorPane: IVisibleEditorPane;
    activeEditor: EditorInput;
    selectedEditors: EditorInput[];
    previewEditor: EditorInput;
    count: number;
    stickyCount: number;
    disposed: boolean;
    editors: readonly EditorInput[];
    label: string;
    isLocked: boolean;
    ariaLabel: string;
    index: number;
    whenRestored: Promise<void>;
    element: HTMLElement;
    minimumWidth: number;
    maximumWidth: number;
    minimumHeight: number;
    maximumHeight: number;
    titleHeight: IEditorGroupTitleHeight;
    isEmpty: boolean;
    onWillDispose: Event<void>;
    onDidModelChange: Event<IGroupModelChangeEvent>;
    onWillCloseEditor: Event<IEditorCloseEvent>;
    onDidCloseEditor: Event<IEditorCloseEvent>;
    onDidOpenEditorFail: Event<EditorInput>;
    onDidFocus: Event<void>;
    onDidChange: Event<{
        width: number;
        height: number;
    }>;
    onWillMoveEditor: Event<IEditorWillMoveEvent>;
    onWillOpenEditor: Event<IEditorWillOpenEvent>;
    onDidActiveEditorChange: Event<IActiveEditorChangeEvent>;
    getEditors(_order?: EditorsOrder): readonly EditorInput[];
    findEditors(_resource: URI): readonly EditorInput[];
    getEditorByIndex(_index: number): EditorInput;
    getIndexOfEditor(_editor: EditorInput): number;
    isFirst(editor: EditorInput): boolean;
    isLast(editor: EditorInput): boolean;
    openEditor(_editor: EditorInput, _options?: IEditorOptions): Promise<IEditorPane>;
    openEditors(_editors: EditorInputWithOptions[]): Promise<IEditorPane>;
    isPinned(_editor: EditorInput): boolean;
    isSticky(_editor: EditorInput): boolean;
    isTransient(_editor: EditorInput): boolean;
    isActive(_editor: EditorInput | IUntypedEditorInput): boolean;
    setSelection(_activeSelectedEditor: EditorInput, _inactiveSelectedEditors: EditorInput[]): Promise<void>;
    isSelected(_editor: EditorInput): boolean;
    contains(candidate: EditorInput | IUntypedEditorInput): boolean;
    moveEditor(_editor: EditorInput, _target: IEditorGroup, _options?: IEditorOptions): boolean;
    moveEditors(_editors: EditorInputWithOptions[], _target: IEditorGroup): boolean;
    copyEditor(_editor: EditorInput, _target: IEditorGroup, _options?: IEditorOptions): void;
    copyEditors(_editors: EditorInputWithOptions[], _target: IEditorGroup): void;
    closeEditor(_editor?: EditorInput, options?: ICloseEditorOptions): Promise<boolean>;
    closeEditors(_editors: EditorInput[] | ICloseEditorsFilter, options?: ICloseEditorOptions): Promise<boolean>;
    closeAllEditors(options?: ICloseAllEditorsOptions): any;
    replaceEditors(_editors: IEditorReplacement[]): Promise<void>;
    pinEditor(_editor?: EditorInput): void;
    stickEditor(editor?: EditorInput | undefined): void;
    unstickEditor(editor?: EditorInput | undefined): void;
    lock(locked: boolean): void;
    focus(): void;
    get scopedContextKeyService(): IContextKeyService;
    setActive(_isActive: boolean): void;
    notifyIndexChanged(_index: number): void;
    notifyLabelChanged(_label: string): void;
    dispose(): void;
    toJSON(): object;
    layout(_width: number, _height: number): void;
    relayout(): void;
    createEditorActions(_menuDisposable: IDisposable): {
        actions: IToolbarActions;
        onDidChange: Event<IMenuChangeEvent>;
    };
}
export declare class TestEditorGroupAccessor implements IEditorGroupsView {
    label: string;
    windowId: number;
    groups: IEditorGroupView[];
    activeGroup: IEditorGroupView;
    partOptions: IEditorPartOptions;
    onDidChangeEditorPartOptions: Event<any>;
    onDidVisibilityChange: Event<any>;
    getGroup(identifier: number): IEditorGroupView | undefined;
    getGroups(order: GroupsOrder): IEditorGroupView[];
    activateGroup(identifier: number | IEditorGroupView): IEditorGroupView;
    restoreGroup(identifier: number | IEditorGroupView): IEditorGroupView;
    addGroup(location: number | IEditorGroupView, direction: GroupDirection): IEditorGroupView;
    mergeGroup(group: number | IEditorGroupView, target: number | IEditorGroupView, options?: IMergeGroupOptions | undefined): boolean;
    moveGroup(group: number | IEditorGroupView, location: number | IEditorGroupView, direction: GroupDirection): IEditorGroupView;
    copyGroup(group: number | IEditorGroupView, location: number | IEditorGroupView, direction: GroupDirection): IEditorGroupView;
    removeGroup(group: number | IEditorGroupView): void;
    arrangeGroups(arrangement: GroupsArrangement, target?: number | IEditorGroupView | undefined): void;
    toggleMaximizeGroup(group: number | IEditorGroupView): void;
    toggleExpandGroup(group: number | IEditorGroupView): void;
}
export declare class TestEditorService extends Disposable implements EditorServiceImpl {
    private editorGroupService?;
    readonly _serviceBrand: undefined;
    onDidActiveEditorChange: Event<void>;
    onDidVisibleEditorsChange: Event<void>;
    onDidEditorsChange: Event<IEditorsChangeEvent>;
    onWillOpenEditor: Event<IEditorWillOpenEvent>;
    onDidCloseEditor: Event<IEditorCloseEvent>;
    onDidOpenEditorFail: Event<IEditorIdentifier>;
    onDidMostRecentlyActiveEditorsChange: Event<void>;
    private _activeTextEditorControl;
    get activeTextEditorControl(): ICodeEditor | IDiffEditor | undefined;
    set activeTextEditorControl(value: ICodeEditor | IDiffEditor | undefined);
    activeEditorPane: IVisibleEditorPane | undefined;
    activeTextEditorLanguageId: string | undefined;
    private _activeEditor;
    get activeEditor(): EditorInput | undefined;
    set activeEditor(value: EditorInput | undefined);
    editors: readonly EditorInput[];
    mostRecentlyActiveEditors: readonly IEditorIdentifier[];
    visibleEditorPanes: readonly IVisibleEditorPane[];
    visibleTextEditorControls: never[];
    getVisibleTextEditorControls(order: EditorsOrder): readonly (IEditor | IDiffEditor)[];
    visibleEditors: readonly EditorInput[];
    count: number;
    constructor(editorGroupService?: IEditorGroupsService | undefined);
    createScoped(editorGroupsContainer: IEditorGroupsContainer): IEditorService;
    getEditors(): never[];
    findEditors(): any;
    openEditor(editor: EditorInput, options?: IEditorOptions, group?: PreferredGroup): Promise<IEditorPane | undefined>;
    openEditor(editor: IResourceEditorInput | IUntitledTextResourceEditorInput, group?: PreferredGroup): Promise<IEditorPane | undefined>;
    openEditor(editor: IResourceDiffEditorInput, group?: PreferredGroup): Promise<ITextDiffEditorPane | undefined>;
    closeEditor(editor: IEditorIdentifier, options?: ICloseEditorOptions): Promise<void>;
    closeEditors(editors: IEditorIdentifier[], options?: ICloseEditorOptions): Promise<void>;
    doResolveEditorOpenRequest(editor: EditorInput | IUntypedEditorInput): [IEditorGroup, EditorInput, IEditorOptions | undefined] | undefined;
    openEditors(_editors: any, _group?: any): Promise<IEditorPane[]>;
    isOpened(_editor: IResourceEditorInputIdentifier): boolean;
    isVisible(_editor: EditorInput): boolean;
    replaceEditors(_editors: any, _group: any): Promise<undefined>;
    save(editors: IEditorIdentifier[], options?: ISaveEditorsOptions): Promise<ISaveEditorsResult>;
    saveAll(options?: ISaveEditorsOptions): Promise<ISaveEditorsResult>;
    revert(editors: IEditorIdentifier[], options?: IRevertOptions): Promise<boolean>;
    revertAll(options?: IRevertAllEditorsOptions): Promise<boolean>;
}
export declare class TestFileService implements IFileService {
    readonly _serviceBrand: undefined;
    private readonly _onDidFilesChange;
    get onDidFilesChange(): Event<FileChangesEvent>;
    fireFileChanges(event: FileChangesEvent): void;
    private readonly _onDidRunOperation;
    get onDidRunOperation(): Event<FileOperationEvent>;
    fireAfterOperation(event: FileOperationEvent): void;
    private readonly _onDidChangeFileSystemProviderCapabilities;
    get onDidChangeFileSystemProviderCapabilities(): Event<IFileSystemProviderCapabilitiesChangeEvent>;
    fireFileSystemProviderCapabilitiesChangeEvent(event: IFileSystemProviderCapabilitiesChangeEvent): void;
    private _onWillActivateFileSystemProvider;
    readonly onWillActivateFileSystemProvider: Event<IFileSystemProviderActivationEvent>;
    readonly onDidWatchError: Event<any>;
    private content;
    private lastReadFileUri;
    readonly: boolean;
    setContent(content: string): void;
    getContent(): string;
    getLastReadFileUri(): URI;
    resolve(resource: URI, _options: IResolveMetadataFileOptions): Promise<IFileStatWithMetadata>;
    resolve(resource: URI, _options?: IResolveFileOptions): Promise<IFileStat>;
    stat(resource: URI): Promise<IFileStatWithPartialMetadata>;
    realpath(resource: URI): Promise<URI>;
    resolveAll(toResolve: {
        resource: URI;
        options?: IResolveFileOptions;
    }[]): Promise<IFileStatResult[]>;
    readonly notExistsSet: ResourceMap<boolean>;
    exists(_resource: URI): Promise<boolean>;
    readShouldThrowError: Error | undefined;
    readFile(resource: URI, options?: IReadFileOptions | undefined): Promise<IFileContent>;
    readFileStream(resource: URI, options?: IReadFileStreamOptions | undefined): Promise<IFileStreamContent>;
    writeShouldThrowError: Error | undefined;
    writeFile(resource: URI, bufferOrReadable: VSBuffer | VSBufferReadable, options?: IWriteFileOptions): Promise<IFileStatWithMetadata>;
    move(_source: URI, _target: URI, _overwrite?: boolean): Promise<IFileStatWithMetadata>;
    copy(_source: URI, _target: URI, _overwrite?: boolean): Promise<IFileStatWithMetadata>;
    cloneFile(_source: URI, _target: URI): Promise<void>;
    createFile(_resource: URI, _content?: VSBuffer | VSBufferReadable, _options?: ICreateFileOptions): Promise<IFileStatWithMetadata>;
    createFolder(_resource: URI): Promise<IFileStatWithMetadata>;
    onDidChangeFileSystemProviderRegistrations: Event<any>;
    private providers;
    registerProvider(scheme: string, provider: IFileSystemProvider): IDisposable;
    getProvider(scheme: string): IFileSystemProvider | undefined;
    activateProvider(_scheme: string): Promise<void>;
    canHandleResource(resource: URI): Promise<boolean>;
    hasProvider(resource: URI): boolean;
    listCapabilities(): {
        scheme: string;
        capabilities: FileSystemProviderCapabilities;
    }[];
    hasCapability(resource: URI, capability: FileSystemProviderCapabilities): boolean;
    del(_resource: URI, _options?: {
        useTrash?: boolean;
        recursive?: boolean;
    }): Promise<void>;
    createWatcher(resource: URI, options: IWatchOptions): IFileSystemWatcher;
    readonly watches: URI[];
    watch(_resource: URI, options: IWatchOptionsWithCorrelation): IFileSystemWatcher;
    watch(_resource: URI): IDisposable;
    getWriteEncoding(_resource: URI): IResourceEncoding;
    dispose(): void;
    canCreateFile(source: URI, options?: ICreateFileOptions): Promise<Error | true>;
    canMove(source: URI, target: URI, overwrite?: boolean | undefined): Promise<Error | true>;
    canCopy(source: URI, target: URI, overwrite?: boolean | undefined): Promise<Error | true>;
    canDelete(resource: URI, options?: {
        useTrash?: boolean | undefined;
        recursive?: boolean | undefined;
    } | undefined): Promise<Error | true>;
}
export declare class TestWorkingCopyBackupService extends InMemoryWorkingCopyBackupService {
    readonly resolved: Set<IWorkingCopyIdentifier>;
    constructor();
    parseBackupContent(textBufferFactory: ITextBufferFactory): string;
    resolve<T extends IWorkingCopyBackupMeta>(identifier: IWorkingCopyIdentifier): Promise<IResolvedWorkingCopyBackup<T> | undefined>;
}
export declare function toUntypedWorkingCopyId(resource: URI): IWorkingCopyIdentifier;
export declare function toTypedWorkingCopyId(resource: URI, typeId?: string): IWorkingCopyIdentifier;
export declare class InMemoryTestWorkingCopyBackupService extends BrowserWorkingCopyBackupService {
    private backupResourceJoiners;
    private discardBackupJoiners;
    discardedBackups: IWorkingCopyIdentifier[];
    constructor();
    testGetFileService(): IFileService;
    joinBackupResource(): Promise<void>;
    joinDiscardBackup(): Promise<void>;
    backup(identifier: IWorkingCopyIdentifier, content?: VSBufferReadableStream | VSBufferReadable, versionId?: number, meta?: any, token?: CancellationToken): Promise<void>;
    discardBackup(identifier: IWorkingCopyIdentifier): Promise<void>;
    getBackupContents(identifier: IWorkingCopyIdentifier): Promise<string>;
}
export declare class TestLifecycleService extends Disposable implements ILifecycleService {
    readonly _serviceBrand: undefined;
    usePhases: boolean;
    _phase: LifecyclePhase;
    get phase(): LifecyclePhase;
    set phase(value: LifecyclePhase);
    private readonly whenStarted;
    private readonly whenReady;
    private readonly whenRestored;
    private readonly whenEventually;
    when(phase: LifecyclePhase): Promise<void>;
    startupKind: StartupKind;
    willShutdown: boolean;
    private readonly _onBeforeShutdown;
    get onBeforeShutdown(): Event<InternalBeforeShutdownEvent>;
    private readonly _onBeforeShutdownError;
    get onBeforeShutdownError(): Event<BeforeShutdownErrorEvent>;
    private readonly _onShutdownVeto;
    get onShutdownVeto(): Event<void>;
    private readonly _onWillShutdown;
    get onWillShutdown(): Event<WillShutdownEvent>;
    private readonly _onDidShutdown;
    get onDidShutdown(): Event<void>;
    shutdownJoiners: Promise<void>[];
    fireShutdown(reason?: ShutdownReason): void;
    fireBeforeShutdown(event: InternalBeforeShutdownEvent): void;
    fireWillShutdown(event: WillShutdownEvent): void;
    shutdown(): Promise<void>;
}
export declare class TestBeforeShutdownEvent implements InternalBeforeShutdownEvent {
    value: boolean | Promise<boolean> | undefined;
    finalValue: (() => boolean | Promise<boolean>) | undefined;
    reason: ShutdownReason;
    veto(value: boolean | Promise<boolean>): void;
    finalVeto(vetoFn: () => boolean | Promise<boolean>): void;
}
export declare class TestWillShutdownEvent implements WillShutdownEvent {
    value: Promise<void>[];
    joiners: () => never[];
    reason: ShutdownReason;
    token: Readonly<CancellationToken>;
    join(promise: Promise<void> | (() => Promise<void>), joiner: IWillShutdownEventJoiner): void;
    force(): void;
}
export declare class TestTextResourceConfigurationService implements ITextResourceConfigurationService {
    private configurationService;
    readonly _serviceBrand: undefined;
    constructor(configurationService?: TestConfigurationService);
    onDidChangeConfiguration(): {
        dispose(): void;
    };
    getValue<T>(resource: URI, arg2?: any, arg3?: any): T;
    inspect<T>(resource: URI | undefined, position: IPosition | null, section: string): IConfigurationValue<Readonly<T>>;
    updateValue(resource: URI, key: string, value: any, configurationTarget?: ConfigurationTarget): Promise<void>;
}
export declare class RemoteFileSystemProvider implements IFileSystemProvider {
    private readonly wrappedFsp;
    private readonly remoteAuthority;
    constructor(wrappedFsp: IFileSystemProvider, remoteAuthority: string);
    readonly capabilities: FileSystemProviderCapabilities;
    readonly onDidChangeCapabilities: Event<void>;
    readonly onDidChangeFile: Event<readonly IFileChange[]>;
    watch(resource: URI, opts: IWatchOptions): IDisposable;
    stat(resource: URI): Promise<IStat>;
    mkdir(resource: URI): Promise<void>;
    readdir(resource: URI): Promise<[string, FileType][]>;
    delete(resource: URI, opts: IFileDeleteOptions): Promise<void>;
    rename(from: URI, to: URI, opts: IFileOverwriteOptions): Promise<void>;
    copy(from: URI, to: URI, opts: IFileOverwriteOptions): Promise<void>;
    readFile(resource: URI): Promise<Uint8Array>;
    writeFile(resource: URI, content: Uint8Array, opts: IFileWriteOptions): Promise<void>;
    open(resource: URI, opts: IFileOpenOptions): Promise<number>;
    close(fd: number): Promise<void>;
    read(fd: number, pos: number, data: Uint8Array, offset: number, length: number): Promise<number>;
    write(fd: number, pos: number, data: Uint8Array, offset: number, length: number): Promise<number>;
    readFileStream(resource: URI, opts: IFileReadStreamOptions, token: CancellationToken): ReadableStreamEvents<Uint8Array>;
    private toFileResource;
}
export declare class TestInMemoryFileSystemProvider extends InMemoryFileSystemProvider implements IFileSystemProviderWithFileReadStreamCapability {
    get capabilities(): FileSystemProviderCapabilities;
    readFileStream(resource: URI): ReadableStreamEvents<Uint8Array>;
}
export declare const productService: IProductService;
export declare class TestHostService implements IHostService {
    readonly _serviceBrand: undefined;
    private _hasFocus;
    get hasFocus(): boolean;
    hadLastFocus(): Promise<boolean>;
    private _onDidChangeFocus;
    readonly onDidChangeFocus: Event<boolean>;
    private _onDidChangeWindow;
    readonly onDidChangeActiveWindow: Event<number>;
    readonly onDidChangeFullScreen: Event<{
        windowId: number;
        fullscreen: boolean;
    }>;
    setFocus(focus: boolean): void;
    restart(): Promise<void>;
    reload(): Promise<void>;
    close(): Promise<void>;
    withExpectedShutdown<T>(expectedShutdownTask: () => Promise<T>): Promise<T>;
    focus(): Promise<void>;
    moveTop(): Promise<void>;
    getCursorScreenPoint(): Promise<undefined>;
    openWindow(arg1?: IOpenEmptyWindowOptions | IWindowOpenable[], arg2?: IOpenWindowOptions): Promise<void>;
    toggleFullScreen(): Promise<void>;
    getScreenshot(rect?: IRectangle): Promise<VSBuffer | undefined>;
    getNativeWindowHandle(_windowId: number): Promise<VSBuffer | undefined>;
    readonly colorScheme = ColorScheme.DARK;
    onDidChangeColorScheme: Event<any>;
}
export declare class TestFilesConfigurationService extends FilesConfigurationService {
    testOnFilesConfigurationChange(configuration: any): void;
}
export declare class TestReadonlyTextFileEditorModel extends TextFileEditorModel {
    isReadonly(): boolean;
}
export declare class TestEditorInput extends EditorInput {
    resource: URI;
    private readonly _typeId;
    constructor(resource: URI, _typeId: string);
    get typeId(): string;
    get editorId(): string;
    resolve(): Promise<IDisposable | null>;
}
export declare function registerTestEditor(id: string, inputs: SyncDescriptor<EditorInput>[], serializerInputId?: string): IDisposable;
export declare function registerTestFileEditor(): IDisposable;
export declare function registerTestResourceEditor(): IDisposable;
export declare function registerTestSideBySideEditor(): IDisposable;
export declare class TestFileEditorInput extends EditorInput implements IFileEditorInput {
    resource: URI;
    private _typeId;
    readonly preferredResource: URI;
    gotDisposed: boolean;
    gotSaved: boolean;
    gotSavedAs: boolean;
    gotReverted: boolean;
    dirty: boolean;
    modified: boolean | undefined;
    private fails;
    disableToUntyped: boolean;
    constructor(resource: URI, _typeId: string);
    get typeId(): string;
    get editorId(): string;
    private _capabilities;
    get capabilities(): EditorInputCapabilities;
    set capabilities(capabilities: EditorInputCapabilities);
    resolve(): Promise<IDisposable | null>;
    matches(other: EditorInput | IResourceEditorInput | ITextResourceEditorInput | IUntitledTextResourceEditorInput): boolean;
    setPreferredResource(resource: URI): void;
    setEncoding(encoding: string): Promise<void>;
    getEncoding(): undefined;
    setPreferredName(name: string): void;
    setPreferredDescription(description: string): void;
    setPreferredEncoding(encoding: string): void;
    setPreferredContents(contents: string): void;
    setLanguageId(languageId: string, source?: string): void;
    setPreferredLanguageId(languageId: string): void;
    setForceOpenAsBinary(): void;
    setFailToOpen(): void;
    save(groupId: GroupIdentifier, options?: ISaveOptions): Promise<EditorInput | undefined>;
    saveAs(groupId: GroupIdentifier, options?: ISaveOptions): Promise<EditorInput | undefined>;
    revert(group: GroupIdentifier, options?: IRevertOptions): Promise<void>;
    toUntyped(): IUntypedEditorInput | undefined;
    setModified(): void;
    isModified(): boolean;
    setDirty(): void;
    isDirty(): boolean;
    isResolved(): boolean;
    dispose(): void;
    movedEditor: IMoveResult | undefined;
    rename(): Promise<IMoveResult | undefined>;
    private moveDisabledReason;
    setMoveDisabled(reason: string): void;
    canMove(sourceGroup: GroupIdentifier, targetGroup: GroupIdentifier): string | true;
}
export declare class TestSingletonFileEditorInput extends TestFileEditorInput {
    get capabilities(): EditorInputCapabilities;
}
export declare class TestEditorPart extends MainEditorPart implements IEditorGroupsService {
    readonly _serviceBrand: undefined;
    readonly mainPart: this;
    readonly parts: readonly IEditorPart[];
    readonly onDidCreateAuxiliaryEditorPart: Event<IAuxiliaryEditorPart>;
    testSaveState(): void;
    clearState(): void;
    registerEditorPart(part: IEditorPart): IDisposable;
    createAuxiliaryEditorPart(): Promise<IAuxiliaryEditorPart>;
    getScopedInstantiationService(part: IEditorPart): IInstantiationService;
    getPart(group: number | IEditorGroup): IEditorPart;
    saveWorkingSet(name: string): IEditorWorkingSet;
    getWorkingSets(): IEditorWorkingSet[];
    applyWorkingSet(workingSet: IEditorWorkingSet | 'empty', options?: IEditorWorkingSetOptions): Promise<boolean>;
    deleteWorkingSet(workingSet: IEditorWorkingSet): Promise<boolean>;
    registerContextKeyProvider<T extends ContextKeyValue>(provider: IEditorGroupContextKeyProvider<T>): IDisposable;
}
export declare class TestEditorParts extends EditorParts {
    testMainPart: TestEditorPart;
    protected createMainEditorPart(): MainEditorPart;
}
export declare function createEditorParts(instantiationService: IInstantiationService, disposables: DisposableStore): Promise<TestEditorParts>;
export declare function createEditorPart(instantiationService: IInstantiationService, disposables: DisposableStore): Promise<TestEditorPart>;
export declare class TestListService implements IListService {
    readonly _serviceBrand: undefined;
    lastFocusedList: any | undefined;
    register(): IDisposable;
}
export declare class TestPathService implements IPathService {
    private readonly fallbackUserHome;
    defaultUriScheme: string;
    readonly _serviceBrand: undefined;
    constructor(fallbackUserHome?: URI, defaultUriScheme?: string);
    hasValidBasename(resource: URI, basename?: string): Promise<boolean>;
    hasValidBasename(resource: URI, os: OperatingSystem, basename?: string): boolean;
    get path(): Promise<import("../../../base/common/path.js").IPath>;
    userHome(options?: {
        preferLocal: boolean;
    }): Promise<URI>;
    userHome(options: {
        preferLocal: true;
    }): URI;
    get resolvedUserHome(): URI;
    fileURI(path: string): Promise<URI>;
}
export interface ITestTextFileEditorModelManager extends ITextFileEditorModelManager, IDisposable {
    add(resource: URI, model: TextFileEditorModel): void;
    remove(resource: URI): void;
}
export declare function getLastResolvedFileStat(model: unknown): IFileStatWithMetadata | undefined;
export declare class TestWorkspacesService implements IWorkspacesService {
    _serviceBrand: undefined;
    onDidChangeRecentlyOpened: Event<any>;
    createUntitledWorkspace(folders?: IWorkspaceFolderCreationData[], remoteAuthority?: string): Promise<IWorkspaceIdentifier>;
    deleteUntitledWorkspace(workspace: IWorkspaceIdentifier): Promise<void>;
    addRecentlyOpened(recents: IRecent[]): Promise<void>;
    removeRecentlyOpened(workspaces: URI[]): Promise<void>;
    clearRecentlyOpened(): Promise<void>;
    getRecentlyOpened(): Promise<IRecentlyOpened>;
    getDirtyWorkspaces(): Promise<(IFolderBackupInfo | IWorkspaceBackupInfo)[]>;
    enterWorkspace(path: URI): Promise<IEnterWorkspaceResult | undefined>;
    getWorkspaceIdentifier(workspacePath: URI): Promise<IWorkspaceIdentifier>;
}
export declare class TestTerminalInstanceService implements ITerminalInstanceService {
    onDidCreateInstance: Event<any>;
    onDidRegisterBackend: Event<any>;
    readonly _serviceBrand: undefined;
    convertProfileToShellLaunchConfig(shellLaunchConfigOrProfile?: IShellLaunchConfig | ITerminalProfile, cwd?: string | URI): IShellLaunchConfig;
    preparePathForTerminalAsync(path: string, executable: string | undefined, title: string, shellType: TerminalShellType, remoteAuthority: string | undefined): Promise<string>;
    createInstance(options: ICreateTerminalOptions, target: TerminalLocation): ITerminalInstance;
    getBackend(remoteAuthority?: string): Promise<ITerminalBackend | undefined>;
    didRegisterBackend(backend: ITerminalBackend): void;
    getRegisteredBackends(): IterableIterator<ITerminalBackend>;
}
export declare class TestTerminalEditorService implements ITerminalEditorService {
    _serviceBrand: undefined;
    activeInstance: ITerminalInstance | undefined;
    instances: readonly ITerminalInstance[];
    onDidDisposeInstance: Event<any>;
    onDidFocusInstance: Event<any>;
    onDidChangeInstanceCapability: Event<any>;
    onDidChangeActiveInstance: Event<any>;
    onDidChangeInstances: Event<any>;
    openEditor(instance: ITerminalInstance, editorOptions?: TerminalEditorLocation): Promise<void>;
    detachInstance(instance: ITerminalInstance): void;
    splitInstance(instanceToSplit: ITerminalInstance, shellLaunchConfig?: IShellLaunchConfig): ITerminalInstance;
    revealActiveEditor(preserveFocus?: boolean): Promise<void>;
    resolveResource(instance: ITerminalInstance): URI;
    reviveInput(deserializedInput: IDeserializedTerminalEditorInput): TerminalEditorInput;
    getInputFromResource(resource: URI): TerminalEditorInput;
    setActiveInstance(instance: ITerminalInstance): void;
    focusActiveInstance(): Promise<void>;
    focusInstance(instance: ITerminalInstance): void;
    getInstanceFromResource(resource: URI | undefined): ITerminalInstance | undefined;
    focusFindWidget(): void;
    hideFindWidget(): void;
    findNext(): void;
    findPrevious(): void;
}
export declare class TestTerminalGroupService implements ITerminalGroupService {
    _serviceBrand: undefined;
    activeInstance: ITerminalInstance | undefined;
    instances: readonly ITerminalInstance[];
    groups: readonly ITerminalGroup[];
    activeGroup: ITerminalGroup | undefined;
    activeGroupIndex: number;
    lastAccessedMenu: 'inline-tab' | 'tab-list';
    onDidChangeActiveGroup: Event<any>;
    onDidDisposeGroup: Event<any>;
    onDidShow: Event<any>;
    onDidChangeGroups: Event<any>;
    onDidChangePanelOrientation: Event<any>;
    onDidDisposeInstance: Event<any>;
    onDidFocusInstance: Event<any>;
    onDidChangeInstanceCapability: Event<any>;
    onDidChangeActiveInstance: Event<any>;
    onDidChangeInstances: Event<any>;
    createGroup(instance?: any): ITerminalGroup;
    getGroupForInstance(instance: ITerminalInstance): ITerminalGroup | undefined;
    moveGroup(source: ITerminalInstance | ITerminalInstance[], target: ITerminalInstance): void;
    moveGroupToEnd(source: ITerminalInstance | ITerminalInstance[]): void;
    moveInstance(source: ITerminalInstance, target: ITerminalInstance, side: 'before' | 'after'): void;
    unsplitInstance(instance: ITerminalInstance): void;
    joinInstances(instances: ITerminalInstance[]): void;
    instanceIsSplit(instance: ITerminalInstance): boolean;
    getGroupLabels(): string[];
    setActiveGroupByIndex(index: number): void;
    setActiveGroupToNext(): void;
    setActiveGroupToPrevious(): void;
    setActiveInstanceByIndex(terminalIndex: number): void;
    setContainer(container: HTMLElement): void;
    showPanel(focus?: boolean): Promise<void>;
    hidePanel(): void;
    focusTabs(): void;
    focusHover(): void;
    setActiveInstance(instance: ITerminalInstance): void;
    focusActiveInstance(): Promise<void>;
    focusInstance(instance: ITerminalInstance): void;
    getInstanceFromResource(resource: URI | undefined): ITerminalInstance | undefined;
    focusFindWidget(): void;
    hideFindWidget(): void;
    findNext(): void;
    findPrevious(): void;
    updateVisibility(): void;
}
export declare class TestTerminalProfileService implements ITerminalProfileService {
    _serviceBrand: undefined;
    availableProfiles: ITerminalProfile[];
    contributedProfiles: IExtensionTerminalProfile[];
    profilesReady: Promise<void>;
    onDidChangeAvailableProfiles: Event<any>;
    getPlatformKey(): Promise<string>;
    refreshAvailableProfiles(): void;
    getDefaultProfileName(): string | undefined;
    getDefaultProfile(): ITerminalProfile | undefined;
    getContributedDefaultProfile(shellLaunchConfig: IShellLaunchConfig): Promise<IExtensionTerminalProfile | undefined>;
    registerContributedProfile(args: IRegisterContributedProfileArgs): Promise<void>;
    getContributedProfileProvider(extensionIdentifier: string, id: string): ITerminalProfileProvider | undefined;
    registerTerminalProfileProvider(extensionIdentifier: string, id: string, profileProvider: ITerminalProfileProvider): IDisposable;
}
export declare class TestTerminalProfileResolverService implements ITerminalProfileResolverService {
    _serviceBrand: undefined;
    defaultProfileName: string;
    resolveIcon(shellLaunchConfig: IShellLaunchConfig): void;
    resolveShellLaunchConfig(shellLaunchConfig: IShellLaunchConfig, options: IShellLaunchConfigResolveOptions): Promise<void>;
    getDefaultProfile(options: IShellLaunchConfigResolveOptions): Promise<ITerminalProfile>;
    getDefaultShell(options: IShellLaunchConfigResolveOptions): Promise<string>;
    getDefaultShellArgs(options: IShellLaunchConfigResolveOptions): Promise<string | string[]>;
    getDefaultIcon(): TerminalIcon & ThemeIcon;
    getEnvironment(): Promise<IProcessEnvironment>;
    getSafeConfigValue(key: string, os: OperatingSystem): unknown | undefined;
    getSafeConfigValueFullKey(key: string): unknown | undefined;
    createProfileFromShellAndShellArgs(shell?: unknown, shellArgs?: unknown): Promise<string | ITerminalProfile>;
}
export declare class TestTerminalConfigurationService extends TerminalConfigurationService {
    get fontMetrics(): import("../../contrib/terminal/browser/terminalConfigurationService.js").TerminalFontMetrics;
    setConfig(config: Partial<ITerminalConfiguration>): void;
}
export declare class TestQuickInputService implements IQuickInputService {
    readonly _serviceBrand: undefined;
    readonly onShow: Event<any>;
    readonly onHide: Event<any>;
    readonly currentQuickInput: undefined;
    readonly quickAccess: never;
    backButton: IQuickInputButton;
    pick<T extends IQuickPickItem>(picks: Promise<QuickPickInput<T>[]> | QuickPickInput<T>[], options?: IPickOptions<T> & {
        canPickMany: true;
    }, token?: CancellationToken): Promise<T[]>;
    pick<T extends IQuickPickItem>(picks: Promise<QuickPickInput<T>[]> | QuickPickInput<T>[], options?: IPickOptions<T> & {
        canPickMany: false;
    }, token?: CancellationToken): Promise<T>;
    input(options?: IInputOptions, token?: CancellationToken): Promise<string>;
    createQuickPick<T extends IQuickPickItem>(): IQuickPick<T, {
        useSeparators: boolean;
    }>;
    createInputBox(): IInputBox;
    createQuickWidget(): IQuickWidget;
    focus(): void;
    toggle(): void;
    navigate(next: boolean, quickNavigate?: IQuickNavigateConfiguration): void;
    accept(): Promise<void>;
    back(): Promise<void>;
    cancel(): Promise<void>;
    setAlignment(alignment: 'top' | 'center' | {
        top: number;
        left: number;
    }): void;
    toggleHover(): void;
}
export declare class TestRemoteAgentService implements IRemoteAgentService {
    readonly _serviceBrand: undefined;
    getConnection(): IRemoteAgentConnection | null;
    getEnvironment(): Promise<IRemoteAgentEnvironment | null>;
    getRawEnvironment(): Promise<IRemoteAgentEnvironment | null>;
    getExtensionHostExitInfo(reconnectionToken: string): Promise<IExtensionHostExitInfo | null>;
    getDiagnosticInfo(options: IDiagnosticInfoOptions): Promise<IDiagnosticInfo | undefined>;
    updateTelemetryLevel(telemetryLevel: TelemetryLevel): Promise<void>;
    logTelemetry(eventName: string, data?: ITelemetryData): Promise<void>;
    flushTelemetry(): Promise<void>;
    getRoundTripTime(): Promise<number | undefined>;
    endConnection(): Promise<void>;
}
export declare class TestRemoteExtensionsScannerService implements IRemoteExtensionsScannerService {
    readonly _serviceBrand: undefined;
    whenExtensionsReady(): Promise<InstallExtensionSummary>;
    scanExtensions(): Promise<IExtensionDescription[]>;
}
export declare class TestWorkbenchExtensionEnablementService implements IWorkbenchExtensionEnablementService {
    _serviceBrand: undefined;
    onEnablementChanged: Event<any>;
    getEnablementState(extension: IExtension): EnablementState;
    getEnablementStates(extensions: IExtension[], workspaceTypeOverrides?: {
        trusted?: boolean | undefined;
    } | undefined): EnablementState[];
    getDependenciesEnablementStates(extension: IExtension): [IExtension, EnablementState][];
    canChangeEnablement(extension: IExtension): boolean;
    canChangeWorkspaceEnablement(extension: IExtension): boolean;
    isEnabled(extension: IExtension): boolean;
    isEnabledEnablementState(enablementState: EnablementState): boolean;
    isDisabledGlobally(extension: IExtension): boolean;
    setEnablement(extensions: IExtension[], state: EnablementState): Promise<boolean[]>;
    updateExtensionsEnablementsWhenWorkspaceTrustChanges(): Promise<void>;
}
export declare class TestWorkbenchExtensionManagementService implements IWorkbenchExtensionManagementService {
    _serviceBrand: undefined;
    onInstallExtension: Event<any>;
    onDidInstallExtensions: Event<any>;
    onUninstallExtension: Event<any>;
    onDidUninstallExtension: Event<any>;
    onDidUpdateExtensionMetadata: Event<any>;
    onProfileAwareInstallExtension: Event<any>;
    onProfileAwareDidInstallExtensions: Event<any>;
    onProfileAwareUninstallExtension: Event<any>;
    onProfileAwareDidUninstallExtension: Event<any>;
    onDidProfileAwareUninstallExtensions: Event<any>;
    onProfileAwareDidUpdateExtensionMetadata: Event<any>;
    onDidChangeProfile: Event<any>;
    onDidEnableExtensions: Event<any>;
    preferPreReleases: boolean;
    installVSIX(location: URI, manifest: Readonly<IRelaxedExtensionManifest>, installOptions?: InstallOptions | undefined): Promise<ILocalExtension>;
    installFromLocation(location: URI): Promise<ILocalExtension>;
    installGalleryExtensions(extensions: InstallExtensionInfo[]): Promise<InstallExtensionResult[]>;
    updateFromGallery(gallery: IGalleryExtension, extension: ILocalExtension, installOptions?: InstallOptions | undefined): Promise<ILocalExtension>;
    zip(extension: ILocalExtension): Promise<URI>;
    getManifest(vsix: URI): Promise<Readonly<IRelaxedExtensionManifest>>;
    install(vsix: URI, options?: InstallOptions | undefined): Promise<ILocalExtension>;
    isAllowed(): true | IMarkdownString;
    canInstall(extension: IGalleryExtension): Promise<true>;
    installFromGallery(extension: IGalleryExtension, options?: InstallOptions | undefined): Promise<ILocalExtension>;
    uninstall(extension: ILocalExtension, options?: UninstallOptions | undefined): Promise<void>;
    uninstallExtensions(extensions: UninstallExtensionInfo[]): Promise<void>;
    getInstalled(type?: ExtensionType | undefined): Promise<ILocalExtension[]>;
    getExtensionsControlManifest(): Promise<IExtensionsControlManifest>;
    updateMetadata(local: ILocalExtension, metadata: Partial<Metadata>): Promise<ILocalExtension>;
    registerParticipant(pariticipant: IExtensionManagementParticipant): void;
    getTargetPlatform(): Promise<TargetPlatform>;
    cleanUp(): Promise<void>;
    download(): Promise<URI>;
    copyExtensions(): Promise<void>;
    toggleApplicationScope(): Promise<ILocalExtension>;
    installExtensionsFromProfile(): Promise<ILocalExtension[]>;
    whenProfileChanged(from: IUserDataProfile, to: IUserDataProfile): Promise<void>;
    getInstalledWorkspaceExtensionLocations(): URI[];
    getInstalledWorkspaceExtensions(): Promise<ILocalExtension[]>;
    installResourceExtension(): Promise<ILocalExtension>;
    getExtensions(): Promise<IResourceExtension[]>;
    resetPinnedStateForAllUserExtensions(pinned: boolean): Promise<void>;
    getInstallableServers(extension: IGalleryExtension): Promise<IExtensionManagementServer[]>;
    isPublisherTrusted(extension: IGalleryExtension): boolean;
    getTrustedPublishers(): never[];
    trustPublishers(): void;
    untrustPublishers(): void;
    requestPublisherTrust(extensions: InstallExtensionInfo[]): Promise<void>;
}
export declare class TestUserDataProfileService implements IUserDataProfileService {
    readonly _serviceBrand: undefined;
    readonly onDidChangeCurrentProfile: Event<any>;
    readonly currentProfile: IUserDataProfile;
    updateCurrentProfile(): Promise<void>;
}
export declare class TestWebExtensionsScannerService implements IWebExtensionsScannerService {
    _serviceBrand: undefined;
    onDidChangeProfile: Event<any>;
    scanSystemExtensions(): Promise<IExtension[]>;
    scanUserExtensions(): Promise<IScannedExtension[]>;
    scanExtensionsUnderDevelopment(): Promise<IExtension[]>;
    copyExtensions(): Promise<void>;
    scanExistingExtension(extensionLocation: URI, extensionType: ExtensionType): Promise<IScannedExtension | null>;
    addExtension(location: URI, metadata?: Partial<IGalleryMetadata & {
        isApplicationScoped: boolean;
        isMachineScoped: boolean;
        isBuiltin: boolean;
        isSystem: boolean;
        updated: boolean;
        preRelease: boolean;
        installedTimestamp: number;
    }> | undefined): Promise<IExtension>;
    addExtensionFromGallery(galleryExtension: IGalleryExtension, metadata?: Partial<IGalleryMetadata & {
        isApplicationScoped: boolean;
        isMachineScoped: boolean;
        isBuiltin: boolean;
        isSystem: boolean;
        updated: boolean;
        preRelease: boolean;
        installedTimestamp: number;
    }> | undefined): Promise<IExtension>;
    removeExtension(): Promise<void>;
    updateMetadata(extension: IScannedExtension, metaData: Partial<Metadata>, profileLocation: URI): Promise<IScannedExtension>;
    scanExtensionManifest(extensionLocation: URI): Promise<Readonly<IRelaxedExtensionManifest> | null>;
}
export declare function workbenchTeardown(instantiationService: IInstantiationService): Promise<void>;
export {};
