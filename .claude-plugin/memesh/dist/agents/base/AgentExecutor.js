export class AgentExecutor {
    async execute(input) {
        try {
            this.validateInput(input);
            const result = await this.performExecution(input);
            return result;
        }
        catch (error) {
            return this.handleError(error);
        }
    }
}
//# sourceMappingURL=AgentExecutor.js.map