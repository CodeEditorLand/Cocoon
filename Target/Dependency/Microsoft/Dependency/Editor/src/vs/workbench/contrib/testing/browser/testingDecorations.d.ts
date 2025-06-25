import { IAction } from '../../../../base/common/actions.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, IReference } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { ICodeEditor, IEditorMouseEvent } from '../../../../editor/browser/editorBrowser.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { Position } from '../../../../editor/common/core/position.js';
import { IEditorContribution } from '../../../../editor/common/editorCommon.js';
import { IModelDecorationOptions, IModelDeltaDecoration, ITextModel } from '../../../../editor/common/model.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { IMenuService } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ITestProfileService } from '../common/testProfileService.js';
import { ITestResult } from '../common/testResult.js';
import { ITestResultService } from '../common/testResultService.js';
import { ITestService } from '../common/testService.js';
import { ITestMessage, IncrementalTestCollectionItem, InternalTestItem, TestResultItem, TestResultState, TestRunProfileBitset } from '../common/testTypes.js';
import { ITestDecoration as IPublicTestDecoration, ITestingDecorationsService } from '../common/testingDecorations.js';
interface ITestDecoration extends IPublicTestDecoration {
    id: string;
    click(e: IEditorMouseEvent): boolean;
}
/** Value for saved decorations, providing fast accessors for the hot 'syncDecorations' path */
declare class CachedDecorations {
    private readonly runByIdKey;
    get size(): number;
    /** Gets a test run decoration that contains exactly the given test IDs */
    getForExactTests(testIds: string[]): RunTestDecoration | undefined;
    /** Adds a new test run decroation */
    addTest(d: RunTestDecoration): void;
    /** Finds an extension by VS Code event ID */
    getById(decorationId: string): RunTestDecoration | undefined;
    /** Iterate over all decorations */
    [Symbol.iterator](): IterableIterator<ITestDecoration>;
}
export declare class TestingDecorationService extends Disposable implements ITestingDecorationsService {
    private readonly configurationService;
    private readonly testService;
    private readonly results;
    private readonly instantiationService;
    private readonly modelService;
    _serviceBrand: undefined;
    private generation;
    private readonly changeEmitter;
    private readonly decorationCache;
    /**
     * List of messages that should be hidden because an editor changed their
     * underlying ranges. I think this is good enough, because:
     *  - Message decorations are never shown across reloads; this does not
     *    need to persist
     *  - Message instances are stable for any completed test results for
     *    the duration of the session.
     */
    private readonly invalidatedMessages;
    /** @inheritdoc */
    readonly onDidChange: Event<void>;
    constructor(codeEditorService: ICodeEditorService, configurationService: IConfigurationService, testService: ITestService, results: ITestResultService, instantiationService: IInstantiationService, modelService: IModelService);
    /** @inheritdoc */
    invalidateResultMessage(message: ITestMessage): void;
    /** @inheritdoc */
    syncDecorations(resource: URI): CachedDecorations;
    /** @inheritdoc */
    getDecoratedTestPosition(resource: URI, testId: string): Position | undefined;
    private invalidate;
    /**
     * Sets whether alternate actions are shown for the model.
     */
    updateDecorationsAlternateAction(resource: URI, isAlt: boolean): void;
    /**
     * Applies the current set of test decorations to the given text model.
     */
    private applyDecorations;
}
export declare class TestingDecorations extends Disposable implements IEditorContribution {
    private readonly editor;
    private readonly codeEditorService;
    private readonly testService;
    private readonly decorations;
    private readonly uriIdentityService;
    private readonly results;
    private readonly configurationService;
    private readonly instantiationService;
    /**
     * Results invalidated by editor changes.
     */
    static invalidatedTests: WeakSet<ITestMessage | TestResultItem>;
    /**
     * Gets the decorations associated with the given code editor.
     */
    static get(editor: ICodeEditor): TestingDecorations | null;
    get currentUri(): URI | undefined;
    private _currentUri?;
    private readonly expectedWidget;
    private readonly actualWidget;
    private readonly errorContentWidgets;
    private readonly loggedMessageDecorations;
    constructor(editor: ICodeEditor, codeEditorService: ICodeEditorService, testService: ITestService, decorations: ITestingDecorationsService, uriIdentityService: IUriIdentityService, results: ITestResultService, configurationService: IConfigurationService, instantiationService: IInstantiationService);
    private attachModel;
    private applyResults;
    private clearResults;
    private isMessageInvalidated;
    private applyResultsContentWidgets;
    private applyContentWidgetsFromResult;
    private applyResultsLoggedMessages;
    private applyLoggedMessageFromResult;
}
declare abstract class RunTestDecoration {
    protected tests: readonly {
        test: IncrementalTestCollectionItem;
        resultItem: TestResultItem | undefined;
    }[];
    private visible;
    protected readonly model: ITextModel;
    private readonly codeEditorService;
    protected readonly testService: ITestService;
    protected readonly contextMenuService: IContextMenuService;
    protected readonly commandService: ICommandService;
    protected readonly configurationService: IConfigurationService;
    protected readonly testProfileService: ITestProfileService;
    protected readonly contextKeyService: IContextKeyService;
    protected readonly menuService: IMenuService;
    /** @inheritdoc */
    id: string;
    get line(): number;
    get testIds(): string[];
    editorDecoration: IModelDeltaDecoration & {
        alternate?: IModelDecorationOptions;
    };
    displayedStates: readonly (TestResultState | undefined)[];
    constructor(tests: readonly {
        test: IncrementalTestCollectionItem;
        resultItem: TestResultItem | undefined;
    }[], visible: boolean, model: ITextModel, codeEditorService: ICodeEditorService, testService: ITestService, contextMenuService: IContextMenuService, commandService: ICommandService, configurationService: IConfigurationService, testProfileService: ITestProfileService, contextKeyService: IContextKeyService, menuService: IMenuService);
    /** @inheritdoc */
    click(e: IEditorMouseEvent): boolean;
    /**
     * Updates the decoration to match the new set of tests.
     * @returns true if options were changed, false otherwise
     */
    replaceOptions(newTests: readonly {
        test: IncrementalTestCollectionItem;
        resultItem: TestResultItem | undefined;
    }[], visible: boolean): boolean;
    /**
     * Gets whether this decoration serves as the run button for the given test ID.
     */
    isForTest(testId: string): boolean;
    /**
     * Called when the decoration is clicked on.
     */
    abstract getContextMenuActions(): IReference<IAction[]>;
    protected runWith(profile: TestRunProfileBitset): Promise<ITestResult>;
    private showContextMenu;
    private getGutterLabel;
    /**
     * Gets context menu actions relevant for a singel test.
     */
    protected getTestContextMenuActions(test: InternalTestItem, resultItem?: TestResultItem): IReference<IAction[]>;
    private getContributedTestActions;
}
export {};
