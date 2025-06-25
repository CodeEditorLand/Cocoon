import { Range } from '../../../../../../../../../editor/common/core/range.js';
import { IMarkdownString } from '../../../../../../../../../base/common/htmlContent.js';
import { BaseToken } from '../../../../codecs/base/baseToken.js';
import type { TAddAccessor, TChangeAccessor, TDecorationStyles, TRemoveAccessor } from './types.js';
/**
 * Base class for all editor decorations.
 */
export declare abstract class DecorationBase<TPromptToken extends BaseToken, TCssClassName extends string = string> {
    protected readonly token: TPromptToken;
    /**
     * Description of the decoration.
     */
    protected abstract get description(): string;
    /**
     * Default CSS class name of the decoration.
     */
    protected abstract get className(): TCssClassName;
    /**
     * Inline CSS class name of the decoration.
     */
    protected abstract get inlineClassName(): TCssClassName;
    /**
     * Indicates whether the decoration spans the whole line(s).
     */
    protected get isWholeLine(): boolean;
    /**
     * Hover message of the decoration.
     */
    protected get hoverMessage(): IMarkdownString | IMarkdownString[] | null;
    /**
     * ID of editor decoration it was registered with.
     */
    readonly id: string;
    constructor(accessor: TAddAccessor, token: TPromptToken);
    /**
     * Range of the decoration.
     */
    get range(): Range;
    /**
     * Changes the decoration in the editor.
     */
    change(accessor: TChangeAccessor): this;
    /**
     * Removes associated editor decoration(s).
     */
    remove(accessor: TRemoveAccessor): this;
    /**
     * Get editor decoration options for this decorator.
     */
    private get decorationOptions();
}
/**
 * Type of a generic decoration class.
 */
export type TDecorationClass<TPromptToken extends BaseToken = BaseToken> = {
    new (accessor: TAddAccessor, token: TPromptToken): DecorationBase<TPromptToken>;
    /**
     * CSS styles for the decoration.
     */
    readonly cssStyles: TDecorationStyles;
    /**
     * Whether the decoration class handles the provided token.
     */
    handles(token: BaseToken): token is TPromptToken;
};
