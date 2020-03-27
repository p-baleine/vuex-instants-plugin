var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import ForeignQueriable from './foreign-queriable';
import { assert } from './utils';
// 関連
var RelationBase = /** @class */ (function () {
    function RelationBase(data, rootModule, name, hasAndBelongsToMany) {
        this.nextIdx = 0;
        assert(function () { return Array.isArray(data); }, data + " must be type Array.");
        this.name = name;
        this.root = rootModule;
        this.data = data;
        this.hasAndBelongsToMany = hasAndBelongsToMany;
    }
    // イテレータインターフェース
    RelationBase.prototype[Symbol.iterator] = function () {
        var data = this.data;
        var nextIdx = this.nextIdx;
        return {
            next: function () {
                var value;
                if (nextIdx < data.length
                    && (value = data[nextIdx])) {
                    nextIdx += 1;
                    return { value: value, done: false };
                }
                else {
                    return { value: value, done: true };
                }
            }
        };
    };
    // TODO: もっとメソッド充実しましょう
    // https://github.com/rails/rails/blob/master/activerecord/lib/active_record/relation/calculations.rb
    RelationBase.prototype.pluck = function (keys) {
        return this.data.flatMap(function (r) {
            return keys.reduce(function (acc, key) {
                var _a;
                return (__assign(__assign({}, acc), (_a = {}, _a[key] = r[key], _a)));
            }, {});
        });
    };
    RelationBase.prototype.ids = function () {
        return this.data.map(function (r) { return r.id; });
    };
    return RelationBase;
}());
export { RelationBase };
// 実際の Relation クラス
// RelationBase + ForeignQueriable
var Relation = /** @class */ (function () {
    function Relation(data, rootModule, name, hasAndBelongsToMany) {
        var x = new RelationBase(data, rootModule, name, hasAndBelongsToMany);
        return new Proxy(x, ForeignQueriable);
    }
    return Relation;
}());
export { Relation };
//# sourceMappingURL=relation.js.map