import { IRange } from '../../../../../../../editor/common/core/range.js';
import { ModelDecorationOptions } from '../../../../../../../editor/common/model/textModel.js';
/**
 * Decoration object.
 */
export interface ITextModelDecoration {
    /**
     * Range of the decoration.
     */
    range: IRange;
    /**
     * Associated decoration options.
     */
    options: ModelDecorationOptions;
}
/**
 * Decoration CSS class names.
 */
export declare enum DecorationClassNames {
    /**
     * CSS class name for `default` prompt syntax decoration.
     */
    Default = "prompt-decoration",
    /**
     * CSS class name for `file reference` prompt syntax decoration.
     */
    FileReference = "prompt-decoration"
}
/**
 * Decoration CSS class modifiers.
 */
export declare enum CssClassModifiers {
    /**
     * CSS class modifier for `active` state of
     * a `reactive` prompt syntax decoration.
     */
    Inactive = ".prompt-decoration-inactive"
}
