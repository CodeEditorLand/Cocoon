/**
 * @module Handler/VscodeAPI/ScmNamespace
 * @description
 * Factory for the vscode.scm namespace shim. Each `createSourceControl` call
 * produces a handle-backed SourceControl whose resource groups and input box
 * changes propagate to Mountain via `register_scm_provider` and
 * `update_scm_group` RPCs.
 */
import type { HandlerContext } from "../../Handler/Context.js";
declare const CreateScmNamespace: (Context: HandlerContext) => {
    createSourceControl: (Id: string, Label: string, RootUri?: unknown) => {
        id: string;
        label: string;
        rootUri: unknown;
        inputBox: {
            value: string;
            placeholder: string;
            enabled: boolean;
            visible: boolean;
        };
        createResourceGroup: (GroupId: string, GroupLabel: string) => {
            id: string;
            label: string;
            resourceStates: unknown[];
            dispose: () => void;
        };
        statusBarCommands: unknown[];
        count: number;
        commitTemplate: string;
        acceptInputCommand: unknown;
        quickDiffProvider: undefined;
        dispose: () => void;
    };
    readonly inputBox: any;
};
export default CreateScmNamespace;
//# sourceMappingURL=Namespace.d.ts.map