import { IJSONSchemaSnippet } from '../../../../base/common/jsonSchema.js';
export declare const defaultTerminalFontSize: number;
export declare function registerTerminalConfiguration(getFontSnippets: () => Promise<IJSONSchemaSnippet[]>): Promise<void>;
