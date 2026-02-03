export class A2ARoutes {
    _agentId;
    taskQueue;
    agentCard;
    constructor(_agentId, taskQueue, agentCard) {
        this._agentId = _agentId;
        this.taskQueue = taskQueue;
        this.agentCard = agentCard;
    }
    sendMessage = async (req, res, next) => {
        try {
            const request = req.body;
            if (!request.message || !request.message.parts) {
                const error = {
                    code: 'INVALID_REQUEST',
                    message: 'Missing required field: message.parts',
                };
                res.status(400).json({ success: false, error });
                return;
            }
            let taskId = request.taskId;
            if (!taskId) {
                const task = this.taskQueue.createTask({
                    name: 'Incoming A2A Task',
                    priority: 'normal',
                    initialMessage: {
                        role: request.message.role,
                        parts: request.message.parts,
                    },
                });
                taskId = task.id;
            }
            else {
                this.taskQueue.addMessage({
                    taskId,
                    role: request.message.role,
                    parts: request.message.parts,
                });
            }
            const response = {
                taskId,
                status: 'SUBMITTED',
            };
            const result = {
                success: true,
                data: response,
            };
            res.status(200).json(result);
        }
        catch (err) {
            next(err);
        }
    };
    getTask = async (req, res, next) => {
        try {
            const { taskId } = req.params;
            if (!taskId) {
                const error = {
                    code: 'INVALID_REQUEST',
                    message: 'Missing required parameter: taskId',
                };
                res.status(400).json({ success: false, error });
                return;
            }
            const task = this.taskQueue.getTask(taskId);
            if (!task) {
                const error = {
                    code: 'NOT_FOUND',
                    message: `Task not found: ${taskId}`,
                };
                res.status(404).json({ success: false, error });
                return;
            }
            const result = {
                success: true,
                data: task,
            };
            res.status(200).json(result);
        }
        catch (err) {
            next(err);
        }
    };
    listTasks = async (req, res, next) => {
        try {
            const { status, limit, offset } = req.query;
            const filter = {};
            if (status) {
                filter.state = status;
            }
            if (limit) {
                const parsedLimit = parseInt(limit, 10);
                if (!isNaN(parsedLimit) && parsedLimit > 0) {
                    filter.limit = parsedLimit;
                }
            }
            if (offset) {
                const parsedOffset = parseInt(offset, 10);
                if (!isNaN(parsedOffset) && parsedOffset >= 0) {
                    filter.offset = parsedOffset;
                }
            }
            const tasks = this.taskQueue.listTasks(filter);
            const result = {
                success: true,
                data: tasks,
            };
            res.status(200).json(result);
        }
        catch (err) {
            next(err);
        }
    };
    getAgentCard = async (_req, res, next) => {
        try {
            const result = {
                success: true,
                data: this.agentCard,
            };
            res.status(200).json(result);
        }
        catch (err) {
            next(err);
        }
    };
    cancelTask = async (req, res, next) => {
        try {
            const { taskId } = req.params;
            if (!taskId) {
                const error = {
                    code: 'INVALID_REQUEST',
                    message: 'Missing required parameter: taskId',
                };
                res.status(400).json({ success: false, error });
                return;
            }
            const updated = this.taskQueue.updateTaskStatus(taskId, {
                state: 'CANCELED',
            });
            if (!updated) {
                const error = {
                    code: 'NOT_FOUND',
                    message: `Task not found: ${taskId}`,
                };
                res.status(404).json({ success: false, error });
                return;
            }
            const result = {
                success: true,
                data: { taskId, status: 'CANCELED' },
            };
            res.status(200).json(result);
        }
        catch (err) {
            next(err);
        }
    };
}
//# sourceMappingURL=routes.js.map