"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LockKind = void 0;
var LockKind = /** @class */ (function () {
    function LockKind(scope, type, timeout) {
        if (timeout === void 0) { timeout = 60; }
        this.scope = scope;
        this.type = type;
        this.timeout = timeout;
    }
    LockKind.prototype.isSimilar = function (lockKind) {
        return this.scope.isSame(lockKind.scope) && this.type.isSame(lockKind.type);
    };
    return LockKind;
}());
exports.LockKind = LockKind;
