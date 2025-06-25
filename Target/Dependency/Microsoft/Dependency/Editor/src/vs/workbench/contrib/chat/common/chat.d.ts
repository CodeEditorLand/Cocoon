import { ChatMode } from './constants.js';
export declare function checkModeOption(mode: ChatMode, option: boolean | ((mode: ChatMode) => boolean) | undefined): boolean | undefined;
