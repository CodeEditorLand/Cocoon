import { DecorationBase } from './decorationBase.js';
import { Position } from '../../../../../../../../../editor/common/core/position.js';
import { BaseToken } from '../../../../codecs/base/baseToken.js';
import type { IReactiveDecorationClassNames, TAddAccessor, TChangeAccessor, TRemoveAccessor } from './types.js';
/**
 * Base class for all reactive editor decorations. A reactive decoration
 * is a decoration that can change its appearance based on current cursor
 * position in the editor, hence can "react" to the user's actions.
 */
export declare abstract class ReactiveDecorationBase<TPromptToken extends BaseToken, TCssClassName extends string = string> extends DecorationBase<TPromptToken, TCssClassName> {
    /**
     * CSS class names of the decoration.
     */
    protected abstract get classNames(): IReactiveDecorationClassNames<TCssClassName>;
    /**
     * A list of child decorators that are part of this decoration.
     * For instance a Front Matter header decoration can have child
     * decorators for each of the header's `---` markers.
     */
    protected readonly childDecorators: DecorationBase<BaseToken>[];
    /**
     * Whether the decoration has changed since the last {@link change}.
     */
    get changed(): boolean;
    constructor(accessor: TAddAccessor, token: TPromptToken);
    /**
     * Current position of cursor in the editor.
     */
    private cursorPosition?;
    /**
     * Private field for the {@link changed} property.
     */
    private didChange;
    /**
     * Whether cursor is currently inside the decoration range.
     */
    protected get active(): boolean;
    /**
     * Set cursor position and update {@link changed} property if needed.
     */
    setCursorPosition(position: Position | null | undefined): this is {
        readonly changed: true;
    };
    change(accessor: TChangeAccessor): this;
    remove(accessor: TRemoveAccessor): this;
    protected get className(): TCssClassName;
    protected get inlineClassName(): TCssClassName;
}
/**
 * Type for a decorator with {@link ReactiveDecorationBase.changed changed} property set to `true`.
 */
export type TChangedDecorator = ReactiveDecorationBase<BaseToken> & {
    readonly changed: true;
};
