import { IndentAction } from '../../../../common/languages/languageConfiguration.js';
export declare const javascriptOnEnterRules: ({
    beforeText: RegExp;
    afterText: RegExp;
    action: {
        indentAction: IndentAction;
        appendText: string;
        removeText?: never;
    };
    previousLineText?: never;
} | {
    beforeText: RegExp;
    action: {
        indentAction: IndentAction;
        appendText: string;
        removeText?: never;
    };
    afterText?: never;
    previousLineText?: never;
} | {
    beforeText: RegExp;
    previousLineText: RegExp;
    action: {
        indentAction: IndentAction;
        appendText: string;
        removeText?: never;
    };
    afterText?: never;
} | {
    beforeText: RegExp;
    action: {
        indentAction: IndentAction;
        removeText: number;
        appendText?: never;
    };
    afterText?: never;
    previousLineText?: never;
} | {
    beforeText: RegExp;
    afterText: RegExp;
    action: {
        indentAction: IndentAction;
        appendText?: never;
        removeText?: never;
    };
    previousLineText?: never;
} | {
    previousLineText: RegExp;
    beforeText: RegExp;
    action: {
        indentAction: IndentAction;
        appendText?: never;
        removeText?: never;
    };
    afterText?: never;
})[];
export declare const phpOnEnterRules: ({
    beforeText: RegExp;
    afterText: RegExp;
    action: {
        indentAction: IndentAction;
        appendText: string;
        removeText?: never;
    };
    previousLineText?: never;
} | {
    beforeText: RegExp;
    action: {
        indentAction: IndentAction;
        appendText: string;
        removeText?: never;
    };
    afterText?: never;
    previousLineText?: never;
} | {
    beforeText: RegExp;
    action: {
        indentAction: IndentAction;
        removeText: number;
        appendText?: never;
    };
    afterText?: never;
    previousLineText?: never;
} | {
    beforeText: RegExp;
    previousLineText: RegExp;
    action: {
        indentAction: IndentAction;
        appendText?: never;
        removeText?: never;
    };
    afterText?: never;
})[];
export declare const cppOnEnterRules: {
    previousLineText: RegExp;
    beforeText: RegExp;
    action: {
        indentAction: IndentAction;
    };
}[];
export declare const htmlOnEnterRules: ({
    beforeText: RegExp;
    afterText: RegExp;
    action: {
        indentAction: IndentAction;
    };
} | {
    beforeText: RegExp;
    action: {
        indentAction: IndentAction;
    };
    afterText?: never;
})[];
