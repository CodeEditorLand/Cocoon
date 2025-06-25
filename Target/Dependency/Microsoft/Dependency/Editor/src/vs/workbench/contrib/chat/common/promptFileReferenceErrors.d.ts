import { URI } from '../../../../base/common/uri.js';
/**
 * Base prompt parsing error class.
 */
declare abstract class ParseError extends Error {
    /**
     * Error type name.
     */
    abstract readonly errorType: string;
    constructor(message?: string, options?: ErrorOptions);
    /**
     * Check if provided object is of the same type as this error.
     */
    sameTypeAs(other: unknown): other is typeof this;
    /**
     * Check if provided object is equal to this error.
     */
    equal(other: unknown): boolean;
}
/**
 * Base resolve error class used when file reference resolution fails.
 */
export declare abstract class ResolveError extends ParseError {
    readonly uri: URI;
    abstract errorType: string;
    constructor(uri: URI, message?: string, options?: ErrorOptions);
}
/**
 * A generic error for failing to resolve prompt contents stream.
 */
export declare class FailedToResolveContentsStream extends ResolveError {
    readonly originalError: unknown;
    errorType: string;
    constructor(uri: URI, originalError: unknown, message?: string);
}
/**
 * Error that reflects the case when attempt to open target file fails.
 */
export declare class OpenFailed extends FailedToResolveContentsStream {
    errorType: string;
    constructor(uri: URI, originalError: unknown);
}
/**
 * Error that reflects the case when attempt resolve nested file
 * references failes due to a recursive reference, e.g.,
 *
 * ```markdown
 * // a.md
 * #file:b.md
 * ```
 *
 * ```markdown
 * // b.md
 * #file:a.md
 * ```
 */
export declare class RecursiveReference extends ResolveError {
    readonly recursivePath: readonly string[];
    errorType: string;
    /**
     * Cached default string representation of the recursive path.
     */
    private defaultPathStringCache;
    constructor(uri: URI, recursivePath: readonly string[]);
    get message(): string;
    /**
     * Returns a string representation of the recursive path.
     */
    getRecursivePathString(filename: 'basename' | 'fullpath', pathJoinCharacter?: string): string;
    /**
     * Check if provided object is of the same type as this
     * error, contains the same recursive path and URI.
     */
    equal(other: unknown): other is this;
    /**
     * Returns a string representation of the error object.
     */
    toString(): string;
}
/**
 * Error for the case when a resource URI doesn't point to a prompt file.
 */
export declare class NotPromptFile extends ResolveError {
    errorType: string;
    constructor(uri: URI, message?: string);
}
/**
 * Error for the case when a resource URI points to a folder.
 */
export declare class FolderReference extends NotPromptFile {
    errorType: string;
    constructor(uri: URI, message?: string);
}
export {};
