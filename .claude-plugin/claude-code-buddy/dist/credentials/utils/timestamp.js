export function safeTimestampToDate(timestamp) {
    if (timestamp === null || timestamp === undefined) {
        return null;
    }
    if (typeof timestamp === 'number') {
        if (!Number.isFinite(timestamp) || timestamp < 0) {
            return null;
        }
        const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
        const date = new Date(ms);
        return isNaN(date.getTime()) ? null : date;
    }
    if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? null : date;
    }
    return null;
}
export function timestampToDate(timestamp, fallback) {
    const date = safeTimestampToDate(timestamp);
    return date !== null ? date : (fallback || new Date());
}
export function isValidTimestamp(timestamp) {
    return safeTimestampToDate(timestamp) !== null;
}
//# sourceMappingURL=timestamp.js.map