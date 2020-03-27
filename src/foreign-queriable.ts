import { assert } from './utils';
import { Id, Relation } from './relation';

export default {
  // Relation のプロパティを経由した別の Relation への getter
  get<S, R>(target: Relation<S, R>, name: string) {
    if (name in target) {
      // 通常のプロパティへのアクセス
      return target[name];
    }

    if (target.data) {
      if (name === 'length') {
        // 存在チェック向けに length は最優先で返す
        return target.data.length;
      }

      if (typeof target.data[name] === 'function') {
        // 配列のメソッドでアクセスされたときは target.data に移譲する
        // target.data が空の場合も target.data の空配列に処理を
        // 移譲したいので、下の空 Relation の判定の前に返す
        return target.data[name].bind(target.data);
      }

      if (!target.data.length) {
        // メソッドチェインがこけないように空の Relation を返す
        return new Relation([], target.root, name, null);
      }

      if (name in target.data[0]) {
        // 子供の問い合わせ
        return childRelation(target, name)
      }

      const hasAndBelongsToMany = target.hasAndBelongsToMany
        && target.hasAndBelongsToMany[name];

      if (hasAndBelongsToMany) {
        // hasAndBelongsToMany の問い合せ
        return hasAndBelongsToManyRelation(target, name);
      }

      if (isIndexName(name)) {
        // インデックス like な名前のときは配列へのアクセスを真似る
        return target.data[name]
      }
    }

    throw new TypeError(`知らんがな: ${name}.`)
  },
};

function isIndexName(name: string) {
  return /\d+/.test(name);
}

function childRelation<S, R>(
  relation: Relation<S, R>, childName: string) {
  // 関連のある relation に対する問合せ
  const { state: rootState } = relation.root;
  const childState = rootState[childName];

  assert(() => !!childState);

  const children = relation.data
    .flatMap(x => x[childName])
    .map(id => childState.byIds[id]);
  const hasAndBelongsToManyOption =
    rootState[childName].hasAndBelongsToMany;

  return new Relation(
    children, relation.root, childName,
    hasAndBelongsToManyOption);
}

function hasAndBelongsToManyRelation<S, R>(
  relation: Relation<S, R>, childName: string) {
  const { state: rootState } = relation.root;
  const hasAndBelongsToMany = relation.hasAndBelongsToMany
    && relation.hasAndBelongsToMany[childName];

  assert(() => !!hasAndBelongsToMany);

  const {
    associationForeignKey,
    foreignKey,
    joinName,
    theirName,
  } = hasAndBelongsToMany;
  const intermediateState = rootState[joinName];
  const childState = rootState[theirName];

  assert(() => !!intermediateState && !!childState);

  const intermediates = Object.values(intermediateState.byIds)
  const children = relation.data
    .flatMap(x => {
      // FIXME: ここふつうに O(N^2) な気がする…
      return intermediates.filter(y => y[foreignKey] === x.id)
    })
    .map(x => {
      return childState.byIds[x[associationForeignKey]];
    });

  const hasAndBelongsToManyOption =
    rootState[theirName].hasAndBelongsToMany;

  return new Relation(
    children, relation.root, theirName,
    hasAndBelongsToManyOption);
}
