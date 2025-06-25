import { SimpleCompletionItem } from './simpleCompletionItem.js';
export interface ISimpleCompletionStats {
    pLabelLen: number;
}
export declare class LineContext {
    readonly leadingLineContent: string;
    readonly characterCountDelta: number;
    constructor(leadingLineContent: string, characterCountDelta: number);
}
export declare class SimpleCompletionModel<T extends SimpleCompletionItem> {
    private readonly _items;
    private _lineContext;
    private readonly _rawCompareFn?;
    private _stats?;
    private _filteredItems?;
    private _refilterKind;
    private _fuzzyScoreOptions;
    private _options;
    constructor(_items: T[], _lineContext: LineContext, _rawCompareFn?: ((leadingLineContent: string, a: T, b: T) => number) | undefined);
    get items(): T[];
    get stats(): ISimpleCompletionStats;
    get lineContext(): LineContext;
    set lineContext(value: LineContext);
    forceRefilterAll(): void;
    private _ensureCachedState;
    private _createCachedState;
}
