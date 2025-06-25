import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { Position } from '../../../../common/core/position.js';
import { ITextModel } from '../../../../common/model.js';
import { InlineCompletion, InlineCompletionContext, InlineCompletions, InlineCompletionsProvider } from '../../../../common/languages.js';
import { ITestCodeEditor, TestCodeEditorInstantiationOptions } from '../../../../test/browser/testCodeEditor.js';
import { InlineCompletionsModel } from '../../browser/model/inlineCompletionsModel.js';
import { ViewModel } from '../../../../common/viewModel/viewModelImpl.js';
export declare class MockInlineCompletionsProvider implements InlineCompletionsProvider {
    private returnValue;
    private delayMs;
    private callHistory;
    private calledTwiceIn50Ms;
    setReturnValue(value: InlineCompletion | undefined, delayMs?: number): void;
    setReturnValues(values: InlineCompletion[], delayMs?: number): void;
    getAndClearCallHistory(): unknown[];
    assertNotCalledTwiceWithin50ms(): void;
    private lastTimeMs;
    provideInlineCompletions(model: ITextModel, position: Position, context: InlineCompletionContext, token: CancellationToken): Promise<{
        items: InlineCompletion[];
    }>;
    disposeInlineCompletions(): void;
    handleItemDidShow(): void;
}
export declare class MockSearchReplaceCompletionsProvider implements InlineCompletionsProvider {
    private _map;
    add(search: string, replace: string): void;
    provideInlineCompletions(model: ITextModel, position: Position, context: InlineCompletionContext, token: CancellationToken): Promise<InlineCompletions>;
    disposeInlineCompletions(): void;
    handleItemDidShow(): void;
}
export declare class InlineEditContext extends Disposable {
    private readonly editor;
    readonly prettyViewStates: (string | undefined)[];
    constructor(model: InlineCompletionsModel, editor: ITestCodeEditor);
    getAndClearViewStates(): (string | undefined)[];
}
export declare class GhostTextContext extends Disposable {
    private readonly editor;
    readonly prettyViewStates: (string | undefined)[];
    private _currentPrettyViewState;
    get currentPrettyViewState(): string | undefined;
    constructor(model: InlineCompletionsModel, editor: ITestCodeEditor);
    getAndClearViewStates(): (string | undefined)[];
    keyboardType(text: string): void;
    cursorUp(): void;
    cursorRight(): void;
    cursorLeft(): void;
    cursorDown(): void;
    cursorLineEnd(): void;
    leftDelete(): void;
}
export interface IWithAsyncTestCodeEditorAndInlineCompletionsModel {
    editor: ITestCodeEditor;
    editorViewModel: ViewModel;
    model: InlineCompletionsModel;
    context: GhostTextContext;
    store: DisposableStore;
}
export declare function withAsyncTestCodeEditorAndInlineCompletionsModel<T>(text: string, options: TestCodeEditorInstantiationOptions & {
    provider?: InlineCompletionsProvider;
    fakeClock?: boolean;
}, callback: (args: IWithAsyncTestCodeEditorAndInlineCompletionsModel) => Promise<T>): Promise<T>;
export declare class AnnotatedString {
    readonly value: string;
    readonly markers: {
        mark: string;
        idx: number;
    }[];
    constructor(src: string, annotations?: string[]);
    getMarkerOffset(markerIdx?: number): number;
}
export declare class AnnotatedText extends AnnotatedString {
    private readonly _transformer;
    getMarkerPosition(markerIdx?: number): Position;
}
