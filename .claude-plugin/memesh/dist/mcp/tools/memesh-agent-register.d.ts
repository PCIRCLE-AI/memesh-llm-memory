import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
export declare const AgentRegisterInputSchema: z.ZodObject<{
    agentType: z.ZodEnum<{
        custom: "custom";
        cursor: "cursor";
        chatgpt: "chatgpt";
        claude: "claude";
        gemini: "gemini";
        grok: "grok";
        deepseek: "deepseek";
        codex: "codex";
    }>;
    agentName: z.ZodOptional<z.ZodString>;
    agentVersion: z.ZodOptional<z.ZodString>;
    capabilities: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type AgentRegisterInput = z.infer<typeof AgentRegisterInputSchema>;
export declare function handleAgentRegister(input: AgentRegisterInput): Promise<CallToolResult>;
//# sourceMappingURL=memesh-agent-register.d.ts.map