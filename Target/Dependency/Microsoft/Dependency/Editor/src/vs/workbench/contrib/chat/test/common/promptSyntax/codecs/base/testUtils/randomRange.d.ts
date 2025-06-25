import { Range } from '../../../../../../../../../editor/common/core/range.js';
/**
 * Generates a random {@link Range} object.
 *
 * @throws if {@link maxNumber} argument is less than `2`,
 *         is equal to `NaN` or is `infinite`.
 */
export declare function randomRange(maxNumber?: number): Range;
/**
 * Generates a random {@link Range} object that is different
 * from the provided one.
 */
export declare function randomRangeNotEqualTo(differentFrom: Range, maxTries?: number): Range;
