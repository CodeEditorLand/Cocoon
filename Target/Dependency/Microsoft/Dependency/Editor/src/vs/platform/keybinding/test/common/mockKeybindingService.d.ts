import { Event } from '../../../../base/common/event.js';
import { Keybinding, ResolvedKeybinding } from '../../../../base/common/keybindings.js';
import { ContextKeyExpression, ContextKeyValue, IContextKey, IContextKeyChangeEvent, IContextKeyService, IContextKeyServiceTarget, IScopedContextKeyService } from '../../../contextkey/common/contextkey.js';
import { IKeybindingService, IKeyboardEvent } from '../../common/keybinding.js';
import { ResolutionResult } from '../../common/keybindingResolver.js';
import { ResolvedKeybindingItem } from '../../common/resolvedKeybindingItem.js';
export declare class MockContextKeyService implements IContextKeyService {
    _serviceBrand: undefined;
    private _keys;
    dispose(): void;
    createKey<T extends ContextKeyValue = ContextKeyValue>(key: string, defaultValue: T | undefined): IContextKey<T>;
    contextMatchesRules(rules: ContextKeyExpression): boolean;
    get onDidChangeContext(): Event<IContextKeyChangeEvent>;
    bufferChangeEvents(callback: () => void): void;
    getContextKeyValue(key: string): any;
    getContext(domNode: HTMLElement): any;
    createScoped(domNode: HTMLElement): IScopedContextKeyService;
    createOverlay(): IContextKeyService;
    updateParent(_parentContextKeyService: IContextKeyService): void;
}
export declare class MockScopableContextKeyService extends MockContextKeyService {
    /**
     * Don't implement this for all tests since we rarely depend on this behavior and it isn't implemented fully
     */
    createScoped(domNote: HTMLElement): IScopedContextKeyService;
}
export declare class MockKeybindingService implements IKeybindingService {
    _serviceBrand: undefined;
    readonly inChordMode: boolean;
    get onDidUpdateKeybindings(): Event<void>;
    getDefaultKeybindingsContent(): string;
    getDefaultKeybindings(): ResolvedKeybindingItem[];
    getKeybindings(): ResolvedKeybindingItem[];
    resolveKeybinding(keybinding: Keybinding): ResolvedKeybinding[];
    resolveKeyboardEvent(keyboardEvent: IKeyboardEvent): ResolvedKeybinding;
    resolveUserBinding(userBinding: string): ResolvedKeybinding[];
    lookupKeybindings(commandId: string): ResolvedKeybinding[];
    lookupKeybinding(commandId: string): ResolvedKeybinding | undefined;
    customKeybindingsCount(): number;
    softDispatch(keybinding: IKeyboardEvent, target: IContextKeyServiceTarget): ResolutionResult;
    dispatchByUserSettingsLabel(userSettingsLabel: string, target: IContextKeyServiceTarget): void;
    dispatchEvent(e: IKeyboardEvent, target: IContextKeyServiceTarget): boolean;
    enableKeybindingHoldMode(commandId: string): undefined;
    mightProducePrintableCharacter(e: IKeyboardEvent): boolean;
    toggleLogging(): boolean;
    _dumpDebugInfo(): string;
    _dumpDebugInfoJSON(): string;
    registerSchemaContribution(): Readonly<import("../../../../base/common/lifecycle.js").IDisposable>;
}
