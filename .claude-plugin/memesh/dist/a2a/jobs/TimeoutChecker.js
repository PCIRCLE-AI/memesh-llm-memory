import { logger } from '../../utils/logger.js';
import { ErrorCodes, formatErrorMessage } from '../errors/index.js';
import { TIME } from '../constants.js';
var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "CLOSED";
    CircuitState["OPEN"] = "OPEN";
    CircuitState["HALF_OPEN"] = "HALF_OPEN";
})(CircuitState || (CircuitState = {}));
export class TimeoutChecker {
    delegator;
    intervalId = null;
    interval;
    circuitState = CircuitState.CLOSED;
    consecutiveErrors = 0;
    lastErrorTime = 0;
    circuitOpenedAt = 0;
    maxConsecutiveErrors;
    circuitCooldownMs;
    enableAlerting;
    totalChecks = 0;
    totalErrors = 0;
    lastSuccessfulCheck = 0;
    constructor(delegator, config = {}) {
        this.delegator = delegator;
        this.interval = config.intervalMs || TIME.TIMEOUT_CHECK_INTERVAL_MS;
        this.maxConsecutiveErrors = config.maxConsecutiveErrors || 5;
        this.circuitCooldownMs = config.circuitCooldownMs || 300_000;
        this.enableAlerting = config.enableAlerting !== false;
    }
    start(intervalMs = TIME.TIMEOUT_CHECK_INTERVAL_MS) {
        if (this.intervalId) {
            logger.warn('[TimeoutChecker] Already running');
            return;
        }
        this.interval = intervalMs;
        this.resetStatistics();
        this.intervalId = setInterval(async () => {
            await this.checkWithCircuitBreaker();
        }, intervalMs);
        logger.info('[TimeoutChecker] Started', {
            intervalMs,
            maxConsecutiveErrors: this.maxConsecutiveErrors,
            circuitCooldownMs: this.circuitCooldownMs,
        });
    }
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            logger.info('[TimeoutChecker] Stopped', {
                statistics: this.getStatistics(),
            });
        }
    }
    isRunning() {
        return this.intervalId !== null;
    }
    getInterval() {
        return this.interval;
    }
    getStatistics() {
        return {
            circuitState: this.circuitState,
            consecutiveErrors: this.consecutiveErrors,
            totalChecks: this.totalChecks,
            totalErrors: this.totalErrors,
            errorRate: this.totalChecks > 0 ? this.totalErrors / this.totalChecks : 0,
            lastSuccessfulCheck: this.lastSuccessfulCheck || null,
        };
    }
    resetCircuit() {
        this.circuitState = CircuitState.CLOSED;
        this.consecutiveErrors = 0;
        this.circuitOpenedAt = 0;
        logger.info('[TimeoutChecker] Circuit manually reset to CLOSED');
    }
    async checkWithCircuitBreaker() {
        this.totalChecks++;
        if (this.circuitState === CircuitState.OPEN) {
            const now = Date.now();
            if (now - this.circuitOpenedAt >= this.circuitCooldownMs) {
                this.circuitState = CircuitState.HALF_OPEN;
                logger.info('[TimeoutChecker] Circuit transitioning to HALF_OPEN for recovery test');
            }
            else {
                logger.debug('[TimeoutChecker] Circuit is OPEN, skipping check', {
                    cooldownRemaining: Math.ceil((this.circuitCooldownMs - (now - this.circuitOpenedAt)) / 1000),
                });
                return;
            }
        }
        try {
            await this.delegator.checkTimeouts();
            this.handleSuccess();
        }
        catch (error) {
            this.handleError(error);
        }
    }
    handleSuccess() {
        this.lastSuccessfulCheck = Date.now();
        if (this.circuitState === CircuitState.HALF_OPEN) {
            this.circuitState = CircuitState.CLOSED;
            logger.info('[TimeoutChecker] Circuit recovered - transitioning to CLOSED', {
                previousErrors: this.consecutiveErrors,
            });
        }
        this.consecutiveErrors = 0;
        logger.debug('[TimeoutChecker] Check completed successfully');
    }
    handleError(error) {
        this.totalErrors++;
        this.consecutiveErrors++;
        this.lastErrorTime = Date.now();
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('[TimeoutChecker] Check failed', {
            error: errorMessage,
            consecutiveErrors: this.consecutiveErrors,
            maxConsecutiveErrors: this.maxConsecutiveErrors,
            circuitState: this.circuitState,
            stack: error instanceof Error ? error.stack : undefined,
        });
        if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
            this.openCircuit();
        }
    }
    openCircuit() {
        if (this.circuitState === CircuitState.OPEN) {
            return;
        }
        this.circuitState = CircuitState.OPEN;
        this.circuitOpenedAt = Date.now();
        const alertMessage = formatErrorMessage(ErrorCodes.TIMEOUT_CHECKER_CIRCUIT_OPEN, this.consecutiveErrors, this.maxConsecutiveErrors);
        logger.error('[TimeoutChecker] Circuit breaker OPENED', {
            consecutiveErrors: this.consecutiveErrors,
            maxConsecutiveErrors: this.maxConsecutiveErrors,
            cooldownMs: this.circuitCooldownMs,
            statistics: this.getStatistics(),
        });
        if (this.enableAlerting) {
            this.sendAlert(alertMessage);
        }
    }
    sendAlert(message) {
        logger.error('[TimeoutChecker] ALERT: Systematic failure detected', {
            message,
            statistics: this.getStatistics(),
            timestamp: new Date().toISOString(),
        });
    }
    resetStatistics() {
        this.totalChecks = 0;
        this.totalErrors = 0;
        this.consecutiveErrors = 0;
        this.lastSuccessfulCheck = 0;
        this.lastErrorTime = 0;
        this.circuitState = CircuitState.CLOSED;
        this.circuitOpenedAt = 0;
    }
}
//# sourceMappingURL=TimeoutChecker.js.map