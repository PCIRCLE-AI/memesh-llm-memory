export interface TutorialProgress {
    currentStep: number;
    totalSteps: number;
    completedSteps: string[];
    startTime: Date;
}
export declare class InteractiveTutorial {
    private progress;
    private readonly TOTAL_STEPS;
    constructor();
    run(): Promise<void>;
    private showWelcome;
    private step1_Welcome;
    private step2_SetupVerification;
    private step3_FirstBuddyDo;
    private step4_MemoryStorage;
    private step5_MemoryRecall;
    private step6_AdvancedFeatures;
    private step7_NextSteps;
    private showCompletion;
    private showStepHeader;
    private createProgressBar;
    private pressEnterToContinue;
    private handleError;
}
export declare function runTutorial(): Promise<void>;
//# sourceMappingURL=tutorial.d.ts.map