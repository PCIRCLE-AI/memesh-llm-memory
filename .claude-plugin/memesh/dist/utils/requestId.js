import crypto from 'crypto';
export function generateRequestId() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `req-${timestamp}-${random}`;
}
export function isValidRequestId(requestId) {
    return /^req-\d{13}-[0-9a-f]{8}$/.test(requestId);
}
export function extractTimestamp(requestId) {
    const match = requestId.match(/^req-(\d{13})-[0-9a-f]{8}$/);
    if (!match) {
        return null;
    }
    return parseInt(match[1], 10);
}
//# sourceMappingURL=requestId.js.map