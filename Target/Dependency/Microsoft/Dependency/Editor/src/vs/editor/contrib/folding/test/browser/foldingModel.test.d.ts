import { IModelDecorationsChangeAccessor, ITextModel } from '../../../../common/model.js';
import { ModelDecorationOptions } from '../../../../common/model/textModel.js';
interface ExpectedDecoration {
    line: number;
    type: 'hidden' | 'collapsed' | 'expanded';
}
export declare class TestDecorationProvider {
    private model;
    private static readonly collapsedDecoration;
    private static readonly expandedDecoration;
    private static readonly hiddenDecoration;
    constructor(model: ITextModel);
    getDecorationOption(isCollapsed: boolean, isHidden: boolean): ModelDecorationOptions;
    changeDecorations<T>(callback: (changeAccessor: IModelDecorationsChangeAccessor) => T): (T | null);
    removeDecorations(decorationIds: string[]): void;
    getDecorations(): ExpectedDecoration[];
}
export {};
