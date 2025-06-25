export declare function clamp(value: number, min: number, max: number): number;
export declare function rot(index: number, modulo: number): number;
export declare class Counter {
    private _next;
    getNext(): number;
}
export declare class MovingAverage {
    private _n;
    private _val;
    update(value: number): number;
    get value(): number;
}
export declare class SlidingWindowAverage {
    private _n;
    private _val;
    private readonly _values;
    private _index;
    private _sum;
    constructor(size: number);
    update(value: number): number;
    get value(): number;
}
/** Returns whether the point is within the triangle formed by the following 6 x/y point pairs */
export declare function isPointWithinTriangle(x: number, y: number, ax: number, ay: number, bx: number, by: number, cx: number, cy: number): boolean;
/**
 * Function to get a (pseudo)random integer from a provided `max`...[`min`] range.
 * Both `min` and `max` values are inclusive. The `min` value is optional (defaults to `0`).
 *
 * @throws in the next cases:
 * 	- if provided `min` or `max` is not a number
 *  - if provided `min` or `max` is not finite
 *  - if provided `min` is larger than `max` value
 *
 * ## Examples
 *
 * Specifying a `max` value only uses `0` as the `min` value by default:
 *
 * ```typescript
 * // get a random integer between 0 and 10
 * const randomInt = randomInt(10);
 *
 * assert(
 *   randomInt >= 0,
 *   'Should be greater than or equal to 0.',
 * );
 *
 * assert(
 *   randomInt <= 10,
 *   'Should be less than or equal to 10.',
 * );
 * ```
 * * Specifying both `max` and `min` values:
 *
 * ```typescript
 * // get a random integer between 5 and 8
 * const randomInt = randomInt(8, 5);
 *
 * assert(
 *   randomInt >= 5,
 *   'Should be greater than or equal to 5.',
 * );
 *
 * assert(
 *   randomInt <= 8,
 *   'Should be less than or equal to 8.',
 * );
 * ```
 */
export declare function randomInt(max: number, min?: number): number;
export declare function randomChance(p: number): boolean;
