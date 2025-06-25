import { SingleModifierChord, Keybinding } from '../../../../../base/common/keybindings.js';
import { IKeyboardEvent } from '../../../../../platform/keybinding/common/keybinding.js';
import { IKeyboardMapper } from '../../../../../platform/keyboardLayout/common/keyboardMapper.js';
export interface IResolvedKeybinding {
    label: string | null;
    ariaLabel: string | null;
    electronAccelerator: string | null;
    userSettingsLabel: string | null;
    isWYSIWYG: boolean;
    isMultiChord: boolean;
    dispatchParts: (string | null)[];
    singleModifierDispatchParts: (SingleModifierChord | null)[];
}
export declare function assertResolveKeyboardEvent(mapper: IKeyboardMapper, keyboardEvent: IKeyboardEvent, expected: IResolvedKeybinding): void;
export declare function assertResolveKeybinding(mapper: IKeyboardMapper, keybinding: Keybinding, expected: IResolvedKeybinding[]): void;
export declare function readRawMapping<T>(file: string): Promise<T>;
export declare function assertMapping(writeFileIfDifferent: boolean, mapper: IKeyboardMapper, file: string): Promise<void>;
