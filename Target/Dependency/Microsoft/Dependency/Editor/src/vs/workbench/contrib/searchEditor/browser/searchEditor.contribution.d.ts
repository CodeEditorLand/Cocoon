import * as SearchEditorConstants from './constants.js';
export type LegacySearchEditorArgs = Partial<{
    query: string;
    includes: string;
    excludes: string;
    contextLines: number;
    wholeWord: boolean;
    caseSensitive: boolean;
    regexp: boolean;
    useIgnores: boolean;
    showIncludesExcludes: boolean;
    triggerSearch: boolean;
    focusResults: boolean;
    location: 'reuse' | 'new';
}>;
export type OpenSearchEditorArgs = Partial<SearchEditorConstants.SearchConfiguration & {
    triggerSearch: boolean;
    focusResults: boolean;
    location: 'reuse' | 'new';
}>;
