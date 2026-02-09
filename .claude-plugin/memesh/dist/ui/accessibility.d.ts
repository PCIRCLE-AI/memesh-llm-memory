export declare enum WCAGLevel {
    AA = "AA",
    AAA = "AAA"
}
export type ScreenReaderEventType = 'progress' | 'status' | 'error' | 'success' | 'info' | 'navigation';
export interface ScreenReaderEvent {
    type: ScreenReaderEventType;
    message: string;
    progress?: number;
    total?: number;
    timestamp: number;
}
export declare function getRelativeLuminance(rgb: [number, number, number]): number;
export declare function parseHexColor(hex: string): [number, number, number];
export declare function getContrastRatio(color1: string | [number, number, number], color2: string | [number, number, number]): number;
export declare function meetsWCAG(ratio: number, level: WCAGLevel, isLargeText?: boolean): boolean;
export declare function verifyContrast(foreground: string, background: string, level?: WCAGLevel, isLargeText?: boolean): {
    ratio: number;
    passes: boolean;
    level: WCAGLevel;
    isLargeText: boolean;
    recommendation?: string;
};
export declare function isScreenReaderEnabled(): boolean;
export declare function emitScreenReaderEvent(event: ScreenReaderEvent): void;
export declare function formatForScreenReader(text: string): string;
export declare function createAccessibleStatus(type: 'success' | 'error' | 'warning' | 'info', message: string): string;
//# sourceMappingURL=accessibility.d.ts.map