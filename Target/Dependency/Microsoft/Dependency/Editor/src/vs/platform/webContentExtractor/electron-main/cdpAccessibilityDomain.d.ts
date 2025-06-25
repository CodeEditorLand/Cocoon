import { URI } from '../../../base/common/uri.js';
export interface AXValue {
    type: AXValueType;
    value?: any;
    relatedNodes?: AXNode[];
    sources?: AXValueSource[];
}
export interface AXValueSource {
    type: AXValueSourceType;
    value?: AXValue;
    attribute?: string;
    attributeValue?: string;
    superseded?: boolean;
    nativeSource?: AXValueNativeSourceType;
    nativeSourceValue?: string;
    invalid?: boolean;
    invalidReason?: string;
}
export interface AXNode {
    nodeId: string;
    ignored: boolean;
    ignoredReasons?: AXProperty[];
    role?: AXValue;
    chromeRole?: AXValue;
    name?: AXValue;
    description?: AXValue;
    value?: AXValue;
    properties?: AXProperty[];
    childIds?: string[];
    backendDOMNodeId?: number;
}
export interface AXProperty {
    name: AXPropertyName;
    value: AXValue;
}
export type AXValueType = 'boolean' | 'tristate' | 'booleanOrUndefined' | 'idref' | 'idrefList' | 'integer' | 'node' | 'nodeList' | 'number' | 'string' | 'computedString' | 'token' | 'tokenList' | 'domRelation' | 'role' | 'internalRole' | 'valueUndefined';
export type AXValueSourceType = 'attribute' | 'implicit' | 'style' | 'contents' | 'placeholder' | 'relatedElement';
export type AXValueNativeSourceType = 'description' | 'figcaption' | 'label' | 'labelfor' | 'labelwrapped' | 'legend' | 'rubyannotation' | 'tablecaption' | 'title' | 'other';
export type AXPropertyName = 'url' | 'busy' | 'disabled' | 'editable' | 'focusable' | 'focused' | 'hidden' | 'hiddenRoot' | 'invalid' | 'keyshortcuts' | 'settable' | 'roledescription' | 'live' | 'atomic' | 'relevant' | 'root' | 'autocomplete' | 'hasPopup' | 'level' | 'multiselectable' | 'orientation' | 'multiline' | 'readonly' | 'required' | 'valuemin' | 'valuemax' | 'valuetext' | 'checked' | 'expanded' | 'pressed' | 'selected' | 'activedescendant' | 'controls' | 'describedby' | 'details' | 'errormessage' | 'flowto' | 'labelledby' | 'owns';
/**
 * Converts an accessibility tree represented by AXNode objects into a markdown string.
 *
 * @param uri The URI of the document
 * @param axNodes The array of AXNode objects representing the accessibility tree
 * @returns A markdown representation of the accessibility tree
 */
export declare function convertAXTreeToMarkdown(uri: URI, axNodes: AXNode[]): string;
