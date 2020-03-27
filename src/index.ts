import Vuex, { Store, StoreOptions } from "vuex";

import { assert } from './utils';
import {
  AllIds,
  ByIds,
  HasAndBelongsToManyOption,
  Id,
  Relation,
} from './relation'

// このプラグイン
// store の `instants` フィールドに getter like なメソッドを
// 用意しておくと、`capture` から呼びだせる。
// 既存の `instants` としては、`findBy` や `where` などがある
//     this.$store.capture('users/where', { id: 111 })
interface InstantsPlugin<S, R> extends Store<S> {
  capture: Capture<S, R>;
}

// See: https://redux.js.org/recipes/structuring-reducers/normalizing-state-shape
interface NormalizedState {
  allIds: AllIds;
  byIds: ByIds;
  hasAndBelongsToMany: HasAndBelongsToManyOption
}

interface Capture<NormalizedState, R> {
  (type: string, payload?: any):
  object | Relation<NormalizedState, R>;
}

interface NormalizedStoreOptions<S> extends StoreOptions<S> {
  // `instants' may capture snapshot of store's state
  // via puseudo-Rails's ActiveRecord like APIs.
  instants?: any;
}

// TODO: もっと拡張したいな
type WhereCond = { [key: string]: any };

interface Where {
  (allIds: AllIds, byIds: ByIds, cond: WhereCond)
  : Array<any>;
}

function injectInstants<S>(options: NormalizedStoreOptions<S>) {
  if (!options) {
    return
  }

  if (options.instants) {
    options.getters = options.getters || {}
    options.getters = { ...options.getters, ...options.instants }
  }

  if (options.modules) {
    for (const child of Object.values(options.modules)) {
      injectInstants(child)
    }
  }
}

function defineDefaultInstants<S>(
  options: NormalizedStoreOptions<S>) {
  if (!options) {
    return
  }

  options.instants = { ...defaultInstants, ...options.instants }

  if (options.modules) {
    for (const child of Object.values(options.modules)) {
      defineDefaultInstants(child)
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
function install<S, R>() {
  const vuex = window.Vuex || Vuex;

  // Patch `Vuex.Store` to inject Instants.
  vuex.Store = class InstantsInjector<S> extends vuex.Store<S> {
    constructor(options: StoreOptions<S>) {
      defineDefaultInstants(options)
      injectInstants(options)
      super(options)
    }
  };

  // `capture`
  (<InstantsPlugin<S, R> > vuex.Store.prototype).capture =
    function(type, payload) {
      assert(() => (!this.instants || type in this.instants), `
${type} is not defined in store.instans.

Don't you forget adding ${type} in store.instans?
`);

      const desc = Object.getOwnPropertyDescriptor(
        this.getters, type);

      assert(() => !!desc && !!desc.get, `Unknown getter, ${type}`);

      const result =  desc.get.call(this)(payload);
      const name = myName(type);
      // TODO: ForeignQueriable でも使うのでなんか関数きろう
      const hasAndBelongsToManyOption = this.state[name].hasAndBelongsToMany

      return Array.isArray(result)
        ? new Relation(result, this, name, hasAndBelongsToManyOption)
        : result;
    };
}

export default {
  install
};

const where: Where = function(allIds, byIds, cond) {
  return allIds
    .filter(id => {
      const obj = byIds[id];

      for (const [key, value] of Object.entries(cond)) {
        if (typeof value === 'function') {
          if (!value(obj)) {
            return false;
          }
        } else if (obj[key] !== value) {
          return false;
        }
      }

      return true;
    })
    .map(id => byIds[id]);
}

// Defaultly injected Instants(query methods).
// Methods would be compliant to `rails/activerecord`.
const defaultInstants = {
  all: ({ byIds }) => () => {
    return Object.values(byIds);
  },

  where: ({ allIds, byIds }) => (cond: WhereCond) => {
    return where(allIds, byIds, cond)
  },

  findBy: ({ allIds, byIds }) => (cond: WhereCond) => {
    const data = where(allIds, byIds, cond)
    assert(() => data && data[0], 'Record not found.')
    return data[0]
  },

  find: ({ byIds }) => (id: Id) => {
    const obj = byIds[id]
    assert(() => !!obj, `not found ${id}`)
    return obj
  },

  // TODO: Add methods, all, where, ..., etc.
}

// Utils.

// `Store.prototype.capture` の第一引数から、capture の対象の名前を求めたい
// FIXME: ここ、とても fragile なので直したい
// そもそも type から求めること自体が nonsense なのかな？
function myName(type: string) {
  const path = type.split('/').slice(0, -1)
  return path[path.length - 1]
}
