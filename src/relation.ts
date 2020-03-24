import { Module } from 'vuex';

import ForeignQueriable from './foreign-queriable';
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

// 関連
export interface Relation<S, R>
  extends Iterable<NormalizedRelationEntry> {
  name: string;
  root: Module<S, R>;
  data: Array<NormalizedRelationEntry>;
  hasAndBelongsToMany: HasAndBelongsToManyOption;
}

// 関連
export class RelationBase<S, R> implements Relation<S, R> {
  name: string;
  root: Module<S, R>;
  data: Array<NormalizedRelationEntry>;
  hasAndBelongsToMany: HasAndBelongsToManyOption;
  nextIdx: number = 0;

  constructor(
    data: Array<NormalizedRelationEntry>,
    rootModule: Module<S, R>,
    name: string,
    hasAndBelongsToMany: HasAndBelongsToManyOption) {

    assert(() => Array.isArray(data),
           `${data} must be type Array.`)

    this.name = name;
    this.root = rootModule;
    this.data = data;
    this.hasAndBelongsToMany = hasAndBelongsToMany;
  }

  // イテレータインターフェース
  [Symbol.iterator]() {
    const { data } = this;
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

  // TODO: もっとメソッド充実しましょう
  // https://github.com/rails/rails/blob/master/activerecord/lib/active_record/relation/calculations.rb

  pluck(keys: Array<string>) {
    return this.data.flatMap(r => {
      return keys.reduce((acc, key) => ({
        ...acc,
        [key]: r[key],
      }), {})
    });
  }

  ids() {
    return this.data.map(r => r.id)
  }
}

// 実際の Relation クラス
// RelationBase + ForeignQueriable
export class Relation<S, R> {
  constructor(
    data: Array<NormalizedRelationEntry>,
    rootModule: Module<S, R>,
    name: string,
    hasAndBelongsToMany: HasAndBelongsToManyOption) {
    const x = new RelationBase<S, R>(
      data, rootModule, name, hasAndBelongsToMany);
    return (new Proxy(x, ForeignQueriable) as Relation<S, R>);
  }
}
