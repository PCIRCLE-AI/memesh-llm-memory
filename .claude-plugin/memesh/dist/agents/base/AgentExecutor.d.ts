export declare abstract class AgentExecutor<TInput, TOutput> {
    protected abstract validateInput(input: TInput): void;
    protected abstract performExecution(input: TInput): Promise<TOutput>;
    protected abstract handleError(error: Error): TOutput;
    execute(input: TInput): Promise<TOutput>;
}
//# sourceMappingURL=AgentExecutor.d.ts.map