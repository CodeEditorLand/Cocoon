import { IExpression } from '../../../../../base/common/glob.js';
import { URI as uri } from '../../../../../base/common/uri.js';
import { ISearchPathsInfo } from '../../common/queryBuilder.js';
import { IFileQuery, ITextQuery } from '../../common/search.js';
export declare function assertEqualQueries(actual: ITextQuery | IFileQuery, expected: ITextQuery | IFileQuery): void;
export declare function assertEqualSearchPathResults(actual: ISearchPathsInfo, expected: ISearchPathsInfo, message?: string): void;
/**
 * Recursively delete all undefined property values from the search query, to make it easier to
 * assert.deepStrictEqual with some expected object.
 */
export declare function cleanUndefinedQueryValues(q: any): void;
export declare function globalGlob(pattern: string): string[];
export declare function patternsToIExpression(...patterns: string[]): IExpression | undefined;
export declare function getUri(...slashPathParts: string[]): uri;
export declare function fixPath(...slashPathParts: string[]): string;
export declare function normalizeExpression(expression: IExpression | undefined): IExpression | undefined;
