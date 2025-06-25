import { PromptVariableWithData } from './promptVariable.js';
import { IRange, Range } from '../../../../../../../editor/common/core/range.js';
/**
 * Object represents a file reference token inside a chatbot prompt.
 */
export declare class FileReference extends PromptVariableWithData {
    readonly path: string;
    constructor(range: Range, path: string);
    /**
     * Create a {@link FileReference} from a {@link PromptVariableWithData} instance.
     * @throws if variable name is not equal to {@link VARIABLE_NAME}.
     */
    static from(variable: PromptVariableWithData): FileReference;
    /**
     * Get the range of the `link` part of the token (e.g.,
     * the `/path/to/file.md` part of `#file:/path/to/file.md`).
     */
    get linkRange(): IRange | undefined;
}
