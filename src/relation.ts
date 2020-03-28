import { Module } from 'vuex';

import ForeignQueriable, { cascadingQueries } from './foreign-queriable';
import { assert } from './utils';

export type Id = number | string;

export type AllIds = Array<Id>;

export interface NormalizedRelationEntry {
  id: Id;
}

// state の `byIds' には Id 型キーを期待する
// また `byIds` には `id` をプロパティに含むオブジェクトを期待する
export type ByIds = {
  [id in Id]: NormalizedRelationEntry
};

export interface HasAndBelongsToManyOption {
  [key: string]: {
    associationForeignKey?: string,
    foreignKey?: string,
    joinName?: string,
    theirName?: string,
  };
}

export interface Query {
  (parentData: Array<NormalizedRelationEntry>):
  Array<NormalizedRelationEntry>;
}

export interface CascadingQueries<S, R> {
  (relation: Relation<S, R>): Array<NormalizedRelationEntry>;
}

export interface WhereMethod<S, R> {
  where(key: string, cond: { $match: RegExp }): Relation<S, R>;
  where(key: string, cond: any): Relation<S, R>;
}

// 関連
export interface Relation<S, R>
  extends Iterable<NormalizedRelationEntry> {
  name: string;
  root: Module<S, R>;
  queries: Array<Query>;
  whereQueries: Array<Query>;
  hasAndBelongsToMany: HasAndBelongsToManyOption;
}

// 関連
export class RelationBase<S, R>
  implements Relation<S, R>, WhereMethod<S, R> {
  name: string;
  root: Module<S, R>;
  queries: Array<Query>;
  whereQueries: Array<Query> = [];
  hasAndBelongsToMany: HasAndBelongsToManyOption;
  nextIdx: number = 0;

  constructor(
    queries: Array<Query>,
    rootModule: Module<S, R>,
    name: string,
    hasAndBelongsToMany: HasAndBelongsToManyOption) {

    assert(() => Array.isArray(queries),
           `${queries} must be type Array.`)

    this.name = name;
    this.root = rootModule;
    this.queries = queries;
    this.hasAndBelongsToMany = hasAndBelongsToMany;
  }

  // イテレータインターフェース
  [Symbol.iterator]() {
    const data = cascadingQueries(this);
    let { nextIdx } = this;

    return {
      next() {
        let value: any;

        if (nextIdx < data.length
            && (value = data[nextIdx])) {
          nextIdx += 1;
          return { value, done: false };
        } else {
          return { value, done: true }
        }
      }
    }
  }

  // Where
  // TODO: おいだす(https://typescript-jp.gitbook.io/deep-dive/type-system/mixins)
  where(key: string, cond: { $match: RegExp }): Relation<S, R>;
  where(key: string, cond: any){
    const match = (pattern, d) => d[key].match(pattern);
    const equal = (value, d) => d[key] === value;

    let filterFn;

    if (cond && '$match' in cond) {
      filterFn = match.bind(null, cond.$match);
    } else {
      filterFn = equal.bind(null, cond);
    }

    this.whereQueries.push((parentData) => parentData.filter(filterFn));
    return this;
  }

  pluck(keys: Array<string>) {
    return cascadingQueries(this).flatMap(r => {
      return keys.reduce((acc, key) => ({
        ...acc,
        [key]: r[key],
      }), {})
    });
  }

  ids() {
    return cascadingQueries(this).map(r => r.id)
  }
}

// 実際の Relation クラス
// RelationBase + ForeignQueriable
export class Relation<S, R> {
  constructor(
    queries: Array<Query>,
    rootModule: Module<S, R>,
    name: string,
    hasAndBelongsToMany: HasAndBelongsToManyOption) {
    const x = new RelationBase<S, R>(
      queries, rootModule, name, hasAndBelongsToMany);
    return (new Proxy(x, ForeignQueriable) as Relation<S, R>);
  }
}
