var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
import Vuex from "vuex";
import { assert } from './utils';
import { Relation, } from './relation';
function injectInstants(options) {
    if (!options) {
        return;
    }
    if (options.instants) {
        options.getters = options.getters || {};
        options.getters = __assign(__assign({}, options.getters), options.instants);
    }
    if (options.modules) {
        for (var _i = 0, _a = Object.values(options.modules); _i < _a.length; _i++) {
            var child = _a[_i];
            injectInstants(child);
        }
    }
}
function defineDefaultInstants(options) {
    if (!options) {
        return;
    }
    options.instants = __assign(__assign({}, defaultInstants), options.instants);
    if (options.modules) {
        for (var _i = 0, _a = Object.values(options.modules); _i < _a.length; _i++) {
            var child = _a[_i];
            defineDefaultInstants(child);
        }
    }
}
// Install vue-instants-plugin.
//
// This plugin would provide `capture` on `$store`.
// Store is assumed to be compliant to
// “Normalized State Shape Constitution”:
//   https://redux.js.org/recipes/structuring-reducers/normalizing-state-shape
// and if so, you can query to your state by pseudo Rails-like methods.
//
// Please see example.js to know how to use this plugin.
function install() {
    var vuex = window.Vuex || Vuex;
    // Patch `Vuex.Store` to inject Instants.
    vuex.Store = /** @class */ (function (_super) {
        __extends(InstantsInjector, _super);
        function InstantsInjector(options) {
            var _this = this;
            defineDefaultInstants(options);
            injectInstants(options);
            _this = _super.call(this, options) || this;
            return _this;
        }
        return InstantsInjector;
    }(vuex.Store));
    // `capture`
    vuex.Store.prototype.capture =
        function (type, payload) {
            var _this = this;
            assert(function () { return (!_this.instants || type in _this.instants); }, "\n" + type + " is not defined in store.instans.\n\nDon't you forget adding " + type + " in store.instans?\n");
            var desc = Object.getOwnPropertyDescriptor(this.getters, type);
            if (!desc) {
                return;
            }
            assert(function () { return !!desc.get; }, "Unknown getter, " + type);
            var result = desc.get.call(this)(payload);
            var name = myName(type);
            // TODO: ForeignQueriable でも使うのでなんか関数きろう
            var hasAndBelongsToManyOption = this.state[name].hasAndBelongsToMany;
            return Array.isArray(result)
                ? new Relation(result, this, name, hasAndBelongsToManyOption)
                : result;
        };
}
export default {
    install: install
};
var where = function (allIds, byIds, cond) {
    return allIds
        .filter(function (id) {
        var obj = byIds[id];
        for (var _i = 0, _a = Object.entries(cond); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            if (typeof value === 'function') {
                if (!value(obj)) {
                    return false;
                }
            }
            else if (obj[key] !== value) {
                return false;
            }
        }
        return true;
    })
        .map(function (id) { return byIds[id]; });
};
// Defaultly injected Instants(query methods).
// Methods would be compliant to `rails/activerecord`.
var defaultInstants = {
    where: function (_a) {
        var allIds = _a.allIds, byIds = _a.byIds;
        return function (cond) {
            return where(allIds, byIds, cond);
        };
    },
    findBy: function (_a) {
        var allIds = _a.allIds, byIds = _a.byIds;
        return function (cond) {
            var data = where(allIds, byIds, cond);
            assert(function () { return data && data[0]; }, 'Record not found.');
            return data[0];
        };
    },
    find: function (_a) {
        var byIds = _a.byIds;
        return function (id) {
            var obj = byIds[id];
            assert(function () { return !!obj; }, "not found " + id);
            return obj;
        };
    },
};
// Utils.
// `Store.prototype.capture` の第一引数から、capture の対象の名前を求めたい
// FIXME: ここ、とても fragile なので直したい
// そもそも type から求めること自体が nonsense なのかな？
function myName(type) {
    var path = type.split('/').slice(0, -1);
    return path[path.length - 1];
}
//# sourceMappingURL=index.js.map