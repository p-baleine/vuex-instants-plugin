import { assert } from './utils';
import { CascadingQueries, Query, Relation } from './relation';

export default {
  // Relation のプロパティを経由した別の Relation への getter
  get<S, R>(target: Relation<S, R>, name: string) {
    if (name in target) {
      // 通常のプロパティへのアクセス
      return target[name];
    }

    if (target.queries) {
      if (name === 'length') {
        // 存在チェック向けに length は最優先で返す
        return cascadingQueries(target).length;
      }

      const data = cascadingQueries(target);

      if (typeof Array.prototype[name] === 'function') {
        // 配列のメソッドでアクセスされたときは target.data に移譲する
        // target.data が空の場合も target.data の空配列に処理を
        // 移譲したいので、下の空 Relation の判定の前に返す
        return data[name].bind(data);
      }

      if (!data.length) {
        // メソッドチェインがこけないように空の Relation を返す
        return new Relation([], target.root, name, null);
      }

      if (name in data[0]) {
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
        return data[name]
      }
    }

    throw new TypeError(`知らんがな: ${name}.`)
  },
};

function isIndexName(name: string) {
  return /\d+/.test(name);
}

// NOTE: Relation を返すときは、親を覚えておきたい
// NOTE: Relation 意外を返すときは、値に解決したい
// await したい？でも必要ないからなぁ…

function childRelation<S, R>(
  relation: Relation<S, R>, childName: string) {
  // 関連のある relation に対する問合せ
  const { state: rootState } = relation.root;
  const childState = rootState[childName];

  assert(() => !!childState);

  const query: Query = (parentData) => {
    return parentData
    .flatMap(x => x[childName])
    .map(id => childState.byIds[id]);
  }
  const hasAndBelongsToManyOption =
    rootState[childName].hasAndBelongsToMany;

  return new Relation(
    relation.queries.concat(query), relation.root,
    childName, hasAndBelongsToManyOption);
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

  const query: Query = (parentData) => {
    const intermediates = Object.values(intermediateState.byIds)
    return parentData
      .flatMap(x => {
        // FIXME: ここふつうに O(N^2) な気がする…
        return intermediates.filter(y => y[foreignKey] === x.id)
      })
      .map(x => {
        return childState.byIds[x[associationForeignKey]];
      });
  };

  const hasAndBelongsToManyOption =
    rootState[theirName].hasAndBelongsToMany;

  return new Relation(
    relation.queries.concat(query), relation.root, theirName,
    hasAndBelongsToManyOption);
}

// TODO キャッシュ
// TODO: relation に移動する
export const cascadingQueries = <S, R>(relation: Relation<S, R>) => {
  return relation.queries.concat(relation.whereQueries)
  .reduce((acc, query) => query(acc), [])
};
