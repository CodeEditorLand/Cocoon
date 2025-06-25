import { type ContextKeyExpression } from '../../../../../platform/contextkey/common/contextkey.js';
import type { ServicesAccessor } from '../../../../../platform/instantiation/common/instantiation.js';
import { type IKeybindings } from '../../../../../platform/keybinding/common/keybindingsRegistry.js';
export declare const enum TerminalSendSequenceCommandId {
    SendSequence = "workbench.action.terminal.sendSequence"
}
export declare const terminalSendSequenceCommand: (accessor: ServicesAccessor, args: unknown) => Promise<void>;
export declare function registerSendSequenceKeybinding(text: string, rule: {
    when?: ContextKeyExpression;
} & IKeybindings): void;
