export function assert(condition, msg, errorCls) {
    if (msg === void 0) { msg = ''; }
    if (errorCls === void 0) { errorCls = TypeError; }
    if (!condition()) {
        throw new errorCls(msg);
    }
}
//# sourceMappingURL=utils.js.map