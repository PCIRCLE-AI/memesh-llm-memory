import { timingSafeEqual, createHash } from 'crypto';
import { logger } from '../../../utils/logger.js';
function constantTimeCompare(a, b) {
    if (a.length !== b.length) {
        const dummy = 'x'.repeat(b.length);
        const bufferA = Buffer.from(a.length >= b.length ? a : dummy, 'utf8');
        const bufferB = Buffer.from(b, 'utf8');
        if (bufferA.length !== bufferB.length) {
            return false;
        }
        timingSafeEqual(bufferA, bufferB);
        return false;
    }
    try {
        const bufferA = Buffer.from(a, 'utf8');
        const bufferB = Buffer.from(b, 'utf8');
        return timingSafeEqual(bufferA, bufferB);
    }
    catch (error) {
        logger.error('Error in constant-time comparison', { error });
        return false;
    }
}
export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const validToken = process.env.MEMESH_A2A_TOKEN;
    if (!validToken) {
        logger.error('MEMESH_A2A_TOKEN not configured');
        res.status(500).json({
            error: 'Server configuration error',
            code: 'TOKEN_NOT_CONFIGURED'
        });
        return;
    }
    if (!token) {
        res.status(401).json({
            error: 'Authentication token required',
            code: 'AUTH_MISSING'
        });
        return;
    }
    if (!constantTimeCompare(token, validToken)) {
        res.status(401).json({
            error: 'Invalid authentication token',
            code: 'AUTH_INVALID'
        });
        return;
    }
    const authReq = req;
    const body = req.body;
    if (body?.agentCard?.id) {
        authReq.agentId = body.agentCard.id;
    }
    else {
        const tokenHash = createHash('sha256')
            .update(token)
            .digest('hex')
            .substring(0, 16);
        authReq.agentId = `token-${tokenHash}`;
    }
    next();
}
//# sourceMappingURL=auth.js.map