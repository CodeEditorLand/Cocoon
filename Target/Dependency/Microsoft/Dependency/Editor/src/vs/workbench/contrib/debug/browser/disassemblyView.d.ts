import { Dimension } from '../../../../base/browser/dom.js';
import { BareFontInfo } from '../../../../editor/common/config/fontInfo.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';
import { IDebugService, IDebugSession } from '../common/debug.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IEditorGroup } from '../../../services/editor/common/editorGroupsService.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IMenuService } from '../../../../platform/actions/common/actions.js';
export interface IDisassembledInstructionEntry {
    allowBreakpoint: boolean;
    isBreakpointSet: boolean;
    isBreakpointEnabled: boolean;
    /** Instruction reference from the DA */
    instructionReference: string;
    /** Offset from the instructionReference that's the basis for the `instructionOffset` */
    instructionReferenceOffset: number;
    /** The number of instructions (+/-) away from the instructionReference and instructionReferenceOffset this instruction lies */
    instructionOffset: number;
    /** Whether this is the first instruction on the target line. */
    showSourceLocation?: boolean;
    /** Original instruction from the debugger */
    instruction: DebugProtocol.DisassembledInstruction;
    /** Parsed instruction address */
    address: bigint;
}
export declare class DisassemblyView extends EditorPane {
    private readonly _configurationService;
    private readonly _instantiationService;
    private readonly _debugService;
    private readonly _contextMenuService;
    private static readonly NUM_INSTRUCTIONS_TO_LOAD;
    private _fontInfo;
    private _disassembledInstructions;
    private _onDidChangeStackFrame;
    private _previousDebuggingState;
    private _instructionBpList;
    private _enableSourceCodeRender;
    private _loadingLock;
    private readonly _referenceToMemoryAddress;
    private menu;
    constructor(group: IEditorGroup, telemetryService: ITelemetryService, themeService: IThemeService, storageService: IStorageService, _configurationService: IConfigurationService, _instantiationService: IInstantiationService, _debugService: IDebugService, _contextMenuService: IContextMenuService, menuService: IMenuService, contextKeyService: IContextKeyService);
    get fontInfo(): BareFontInfo;
    private createFontInfo;
    get currentInstructionAddresses(): (bigint | undefined)[];
    get focusedCurrentInstructionReference(): string | undefined;
    get focusedCurrentInstructionAddress(): bigint | undefined;
    get focusedInstructionReference(): string | undefined;
    get focusedInstructionAddress(): bigint | undefined;
    get isSourceCodeRender(): boolean;
    get debugSession(): IDebugSession | undefined;
    get onDidChangeStackFrame(): import("../../../workbench.web.main.internal.js").Event<void>;
    get focusedAddressAndOffset(): {
        reference: string;
        offset: number;
        address: bigint;
    } | undefined;
    getAddressAndOffset(element: IDisassembledInstructionEntry): {
        reference: string;
        offset: number;
        address: bigint;
    };
    protected createEditor(parent: HTMLElement): void;
    layout(dimension: Dimension): void;
    goToInstructionAndOffset(instructionReference: string, offset: number, focus?: boolean): Promise<void>;
    /** Gets the address associated with the instruction reference. */
    getReferenceAddress(instructionReference: string): bigint | undefined;
    /**
     * Go to the address provided. If no address is provided, reveal the address of the currently focused stack frame. Returns false if that address is not available.
     */
    private goToAddress;
    private scrollUp_LoadDisassembledInstructions;
    private scrollDown_LoadDisassembledInstructions;
    /**
     * Sets the memory reference address. We don't just loadDisassembledInstructions
     * for this, since we can't really deal with discontiguous ranges (we can't
     * detect _if_ a range is discontiguous since we don't know how much memory
     * comes between instructions.)
     */
    private primeMemoryReference;
    /** Loads disasembled instructions. Returns the number of instructions that were loaded. */
    private loadDisassembledInstructions;
    private getIndexFromReferenceAndOffset;
    private getIndexFromAddress;
    /**
     * Clears the table and reload instructions near the target address
     */
    private reloadDisassembly;
    private clear;
    private onContextMenu;
}
export declare class DisassemblyViewContribution implements IWorkbenchContribution {
    private readonly _onDidActiveEditorChangeListener;
    private _onDidChangeModelLanguage;
    private _languageSupportsDisassembleRequest;
    constructor(editorService: IEditorService, debugService: IDebugService, contextKeyService: IContextKeyService);
    dispose(): void;
}
