export declare const TIME: {
    readonly TASK_TIMEOUT_MS: 300000;
    readonly TIMEOUT_CHECK_INTERVAL_MS: 60000;
    readonly HEARTBEAT_INTERVAL_MS: 60000;
    readonly STALE_AGENT_THRESHOLD_MS: number;
};
export declare const LIMITS: {
    readonly MAX_CONCURRENT_TASKS_PHASE_1: 1;
};
export declare const NETWORK: {
    readonly DEFAULT_PORT_RANGE: {
        readonly min: 3000;
        readonly max: 3999;
    };
    readonly MAX_REQUEST_BODY_SIZE: "10mb";
};
export declare const RATE_LIMITS: {
    readonly DEFAULT_RPM: 100;
    readonly SEND_MESSAGE_RPM: 60;
    readonly GET_TASK_RPM: 120;
    readonly LIST_TASKS_RPM: 100;
    readonly CANCEL_TASK_RPM: 60;
    readonly CLEANUP_INTERVAL_MS: number;
};
export declare const ENV_KEYS: {
    readonly A2A_TOKEN: "MEMESH_A2A_TOKEN";
    readonly TASK_TIMEOUT: "MEMESH_A2A_TASK_TIMEOUT";
    readonly RATE_LIMIT_DEFAULT: "MEMESH_A2A_RATE_LIMIT_DEFAULT";
    readonly RATE_LIMIT_SEND_MESSAGE: "MEMESH_A2A_RATE_LIMIT_SEND_MESSAGE";
    readonly RATE_LIMIT_GET_TASK: "MEMESH_A2A_RATE_LIMIT_GET_TASK";
    readonly RATE_LIMIT_LIST_TASKS: "MEMESH_A2A_RATE_LIMIT_LIST_TASKS";
    readonly RATE_LIMIT_CANCEL_TASK: "MEMESH_A2A_RATE_LIMIT_CANCEL_TASK";
};
//# sourceMappingURL=constants.d.ts.map