import { Event } from '../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { IObservable } from '../../../../../../base/common/observable.js';
import { ICodeEditor } from '../../../../../browser/editorBrowser.js';
import { Range } from '../../../../../common/core/range.js';
import { IconPath } from '../../../../../common/languages.js';
import { ILanguageService } from '../../../../../common/languages/language.js';
import { ITextModel } from '../../../../../common/model.js';
import { LineTokens } from '../../../../../common/tokens/lineTokens.js';
import { LineDecoration } from '../../../../../common/viewLayout/lineDecorations.js';
import { GhostText, GhostTextReplacement } from '../../model/ghostText.js';
import './ghostTextView.css';
import { IMouseEvent } from '../../../../../../base/browser/mouseEvent.js';
export interface IGhostTextWidgetModel {
    readonly targetTextModel: IObservable<ITextModel | undefined>;
    readonly ghostText: IObservable<GhostText | GhostTextReplacement | undefined>;
    readonly warning: IObservable<{
        icon: IconPath | undefined;
    } | undefined>;
    readonly minReservedLineCount: IObservable<number>;
}
export declare class GhostTextView extends Disposable {
    private readonly _editor;
    private readonly _model;
    private readonly _options;
    private readonly _shouldKeepCursorStable;
    private readonly _isClickable;
    private readonly _languageService;
    private readonly _isDisposed;
    private readonly _editorObs;
    static hot: IObservable<typeof GhostTextView>;
    private _warningState;
    private readonly _onDidClick;
    readonly onDidClick: Event<IMouseEvent>;
    constructor(_editor: ICodeEditor, _model: IGhostTextWidgetModel, _options: IObservable<{
        extraClasses?: string[];
        syntaxHighlightingEnabled: boolean;
    }>, _shouldKeepCursorStable: boolean, _isClickable: boolean, _languageService: ILanguageService);
    static getWarningWidgetContext(domNode: HTMLElement): {
        range: Range;
    } | undefined;
    private readonly _useSyntaxHighlighting;
    private readonly _extraClassNames;
    private readonly uiState;
    private readonly decorations;
    private readonly _additionalLinesWidget;
    private readonly _isInlineTextHovered;
    readonly isHovered: import("../../../../../../base/common/observable.js").IObservableWithChange<boolean, void>;
    readonly height: import("../../../../../../base/common/observable.js").IObservableWithChange<number, void>;
    ownsViewZone(viewZoneId: string): boolean;
}
export declare class AdditionalLinesWidget extends Disposable {
    private readonly _editor;
    private readonly _lines;
    private readonly _shouldKeepCursorStable;
    private readonly _isClickable;
    private _viewZoneInfo;
    get viewZoneId(): string | undefined;
    private _viewZoneHeight;
    get viewZoneHeight(): IObservable<number | undefined>;
    private readonly editorOptionsChanged;
    private readonly _onDidClick;
    readonly onDidClick: Event<IMouseEvent>;
    private readonly _viewZoneListener;
    readonly isHovered: IObservable<boolean>;
    private hasBeenAccepted;
    constructor(_editor: ICodeEditor, _lines: IObservable<{
        targetTextModel: ITextModel;
        lineNumber: number;
        additionalLines: LineData[];
        minReservedLineCount: number;
    } | undefined>, _shouldKeepCursorStable: boolean, _isClickable: boolean);
    dispose(): void;
    private clear;
    private updateLines;
    private addViewZone;
    private removeActiveViewZone;
    private keepCursorStable;
}
export interface LineData {
    content: LineTokens;
    decorations: LineDecoration[];
}
export declare const ttPolicy: Pick<TrustedTypePolicy<Options>, "name" | "createHTML"> | undefined;
