export interface IDecorationStyleSet {
    /**
     * A 24-bit number representing `color`.
     */
    color: number | undefined;
    /**
     * Whether the text should be rendered in bold.
     */
    bold: boolean | undefined;
    /**
     * A number between 0 and 1 representing the opacity of the text.
     */
    opacity: number | undefined;
}
export interface IDecorationStyleCacheEntry extends IDecorationStyleSet {
    /**
     * A unique identifier for this set of styles.
     */
    id: number;
}
export declare class DecorationStyleCache {
    private _nextId;
    private readonly _cacheById;
    private readonly _cacheByStyle;
    getOrCreateEntry(color: number | undefined, bold: boolean | undefined, opacity: number | undefined): number;
    getStyleSet(id: number): IDecorationStyleSet | undefined;
}
