import { AnyEdit } from '../../../../editor/common/core/edits/edit.js';
export interface IIndexTransformer {
    transform(index: number): number | undefined;
}
/**
 * Can only be called with increasing values of `index`.
*/
export declare class MonotonousIndexTransformer implements IIndexTransformer {
    private readonly transformation;
    static fromMany(transformations: AnyEdit[]): IIndexTransformer;
    private idx;
    private offset;
    constructor(transformation: AnyEdit);
    /**
     * Precondition: index >= previous-value-of(index).
     */
    transform(index: number): number | undefined;
}
export declare class CombinedIndexTransformer implements IIndexTransformer {
    private readonly transformers;
    constructor(transformers: IIndexTransformer[]);
    transform(index: number): number | undefined;
}
