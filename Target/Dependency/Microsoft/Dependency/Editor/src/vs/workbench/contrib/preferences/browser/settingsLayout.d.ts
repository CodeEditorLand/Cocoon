import { ExtensionToggleData } from '../common/preferences.js';
export interface ITOCEntry<T> {
    id: string;
    label: string;
    order?: number;
    children?: ITOCEntry<T>[];
    settings?: Array<T>;
    hide?: boolean;
}
export declare function getCommonlyUsedData(toggleData: ExtensionToggleData | undefined): ITOCEntry<string>;
export declare const tocData: ITOCEntry<string>;
