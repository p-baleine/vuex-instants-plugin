import { assert } from './utils';
import { Relation } from './relation';
export default {
    // Relation のプロパティを経由した別の Relation への getter
    get: function (target, name) {
        if (name in target) {
            // 通常のプロパティへのアクセス
            return target[name];
        }
        if (target.data) {
            if (name === 'length') {
                // 存在チェック(長さ0の場合)をしたいので一番最優先とする
                return target.data.length;
            }
            if (name in target.data[0]) {
                // 子供の問い合わせ
                return childRelation(target, name);
            }
            var hasAndBelongsToMany = target.hasAndBelongsToMany
                && target.hasAndBelongsToMany[name];
            if (hasAndBelongsToMany) {
                // hasAndBelongsToMany の問い合せ
                return hasAndBelongsToManyRelation(target, name);
            }
            if (isIndexName(name)) {
                // インデックス like な名前のときは配列へのアクセスを真似る
                return target.data[name];
            }
            if (typeof target.data[name] === 'function') {
                // 配列のメソッドでアクセスされたときは target.data に移譲する
                return target.data[name].bind(target.data);
            }
        }
        throw new TypeError("\u77E5\u3089\u3093\u304C\u306A: " + name + ".");
    },
};
function isIndexName(name) {
    return /\d+/.test(name);
}
function childRelation(relation, childName) {
    // 関連のある relation に対する問合せ
    var rootState = relation.root.state;
    var childState = rootState[childName];
    assert(function () { return !!childState; });
    var children = relation.data
        .flatMap(function (x) { return x[childName]; })
        .map(function (id) { return childState.byIds[id]; });
    var hasAndBelongsToManyOption = rootState[childName].hasAndBelongsToMany;
    return new Relation(children, relation.root, childName, hasAndBelongsToManyOption);
}
function hasAndBelongsToManyRelation(relation, childName) {
    var rootState = relation.root.state;
    var hasAndBelongsToMany = relation.hasAndBelongsToMany
        && relation.hasAndBelongsToMany[childName];
    assert(function () { return !!hasAndBelongsToMany; });
    var associationForeignKey = hasAndBelongsToMany.associationForeignKey, foreignKey = hasAndBelongsToMany.foreignKey, joinName = hasAndBelongsToMany.joinName, theirName = hasAndBelongsToMany.theirName;
    var intermediateState = rootState[joinName];
    var childState = rootState[theirName];
    assert(function () { return !!intermediateState && !!childState; });
    var intermediates = Object.values(intermediateState.byIds);
    var children = relation.data
        .flatMap(function (x) {
        // FIXME: ここふつうに O(N^2) な気がする…
        return intermediates.filter(function (y) { return y[foreignKey] === x.id; });
    })
        .map(function (x) {
        return childState.byIds[x[associationForeignKey]];
    });
    var hasAndBelongsToManyOption = rootState[theirName].hasAndBelongsToMany;
    return new Relation(children, relation.root, theirName, hasAndBelongsToManyOption);
}
//# sourceMappingURL=foreign-queriable.js.map