import { Event } from '../../../../base/common/event.js';
import { IAccessibilityService, AccessibilitySupport } from '../../common/accessibility.js';
export declare class TestAccessibilityService implements IAccessibilityService {
    readonly _serviceBrand: undefined;
    onDidChangeScreenReaderOptimized: Event<any>;
    onDidChangeReducedMotion: Event<any>;
    isScreenReaderOptimized(): boolean;
    isMotionReduced(): boolean;
    alwaysUnderlineAccessKeys(): Promise<boolean>;
    setAccessibilitySupport(accessibilitySupport: AccessibilitySupport): void;
    getAccessibilitySupport(): AccessibilitySupport;
    alert(message: string): void;
    status(message: string): void;
}
