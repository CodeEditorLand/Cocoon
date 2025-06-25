import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { IObservable } from '../../../../../../base/common/observable.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IStorageService } from '../../../../../../platform/storage/common/storage.js';
import { InlineEditsGutterIndicator } from './components/gutterIndicatorView.js';
import { IInlineEditHost, IInlineEditModel } from './inlineEditsViewInterface.js';
import { InlineEditsCollapsedView } from './inlineEditsViews/inlineEditsCollapsedView.js';
export declare class InlineEditsOnboardingExperience extends Disposable {
    private readonly _host;
    private readonly _model;
    private readonly _indicator;
    private readonly _collapsedView;
    private readonly _storageService;
    private readonly _configurationService;
    private readonly _disposables;
    private readonly _setupDone;
    private readonly _activeCompletionId;
    constructor(_host: IObservable<IInlineEditHost | undefined>, _model: IObservable<IInlineEditModel | undefined>, _indicator: IObservable<InlineEditsGutterIndicator | undefined>, _collapsedView: InlineEditsCollapsedView, _storageService: IStorageService, _configurationService: IConfigurationService);
    private setupNewUserExperience;
    private getNewUserType;
    private setNewUserType;
    private _initializeDebugSetting;
}
