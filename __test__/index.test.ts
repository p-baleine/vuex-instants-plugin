import Vue from 'vue'
import Vuex from 'vuex'

window.Vuex = Vuex;

import VuexInstantsPlugin from '../src/index.ts'

describe('vue-instants-plugin', () => {
  let store;

  beforeAll(() => {
    Vue.use(Vuex)
    Vue.use(VuexInstantsPlugin)
    store = new Vuex.Store(data)
  })

  describe('capture', () => {
    describe('#all', () => {
      it('Returns all entries.', () => {
        expect(
          store.capture('authors/all')
          .map(x => x.id)
        ).toEqual(
          expect.arrayContaining(['夏目漱石', '芥川龍之介', '森鴎外'])
        );
      });
    });

    describe('#find', () => {
      it('Returns the entry speicified by id.', () => {
        expect(
          store.capture('authors/find', '森鴎外').id
        ).toEqual('森鴎外');
      });
    });

    describe('#where', () => {
      it('Returns relation quried by specified cond.', () => {
        expect(
          store.capture('authors/where', { id: '夏目漱石' })[0].id
        ).toBe('夏目漱石');
      });
    });

    describe('#findBy', () => {
      it('Returns the object quried by specified cond.', () => {
        expect(
          store.capture('authors/findBy', { id: '夏目漱石' }).id
        ).toBe('夏目漱石')
      });
    })

    describe('Relations', () => {
      it('Relation has length property.', () => {
        expect(
          store.capture('works/where', { authorId: '夏目漱石' }).length
        ).toBe(2);
      });

      it('Relation has pluck method.', () => {
        expect(
          store.capture('works/where', { authorId: '夏目漱石' })
          .pluck(['title'])
          .map(x => x.title)
        ).toEqual(
          expect.arrayContaining(['我輩は猫である', 'こころ'])
        );
      });

      it('Relation has map method.', () => {
        expect(
          store.capture('authors/where', { id: '夏目漱石' })
          .map(x => x.works)
        ).toEqual(
          expect.arrayContaining([[1, 2]])
        );
      });

      it('Relation has flatMap method.', () => {
        expect(
          store.capture('authors/where', { id: '夏目漱石' })
          .flatMap(x => x.works)
        ).toEqual(
          expect.arrayContaining([1, 2])
        );
      });

      it('Relation has every method.', () => {
        expect(
          store.capture('authors/where', { id: '夏目漱石' })
          .every(x => x.id === '夏目漱石')
        ).toBe(true);
      });

      it('Relation implements iterator protocol.', () => {
        const works = store.capture('authors/where', { id: '夏目漱石' })
          .works;
        let result = [];

        for (const work of works) {
          result.push(work.title);
        }

        expect(result)
          .toEqual(
            expect.arrayContaining(['我輩は猫である', 'こころ'])
          );
      })

      describe('When empty Relation', () => {
        it('Returns empty Relation.', () => {
          // capture の結果が空のとき、length は 0 を返す
          expect(store.capture('authors/where', { id: 'にゃ' }).length)
            .toBe(0);
        });

        it('Returns empty result on pluck.', () => {
          // capture の結果が空のとき、空の Relation を返すので
          // Relation のメソッドはよべる
          expect(
            store.capture('authors/where', { id: 'だれか' })
            .pluck(['title'])
          ).toEqual([]);
        });

        it('Returns empty result on pluck.', () => {
          // capture の結果が空のとき、空の Relation を返すので
          // Relation のメソッドはよべる
          expect(
            store.capture('authors/where', { id: 'だれか' })
            .map(x => x.id)
          ).toEqual([]);
        });

        describe('When children are empty.', () => {
          it('Returns empty array.', () => {
            // 子供への問い合せの結果が空のとき、length は 0 を返す
            expect(store.capture('authors/where', { id: 'にゃ' }).works.length)
              .toBe(0);
          });

          it('Returns empty array.', () => {
            // 子供への問い合せの結果が空のとき、空の Relation を返すので
            // Relation のメソッドはよべる
            expect(
              store.capture('authors/where', { id: 'にゃ' })
                .works
                .pluck(['title'])
            ).toEqual([]);
          });
        });
      })

      describe('Children', () => {
        it('Returns the object quried by specified cond.', () => {
          expect(
            store
              .capture('authors/where', { id: '夏目漱石' })
              .works
              .pluck(['title'])
          ).toEqual(
            expect.arrayContaining([{ title: '我輩は猫である' }])
          );
        });
      });

      describe('hasMany through', () => {
        it('Returns relations via the `through\' relation.', () => {
          const akutagawaWarks = store
              .capture('authors/where', { id: '夏目漱石' })
              .friends
              .works
              .pluck(['title'])
              .map(r => r.title);

          expect(akutagawaWarks.length).toEqual(2);
          expect(akutagawaWarks)
            .toEqual(expect.arrayContaining(['蜘蛛の糸', '藪の中']));
          expect(akutagawaWarks)
            .toEqual(expect.not.arrayContaining(['我輩は猫である']));
          expect(akutagawaWarks)
            .toEqual(expect.not.arrayContaining(['こころ']));
          expect(akutagawaWarks)
            .toEqual(expect.not.arrayContaining(['雁']));
        });
      });
    });
  });
});

const data = {
  modules: {
    authors: {
      namespaced: true,
      state: {
        allIds: ['夏目漱石', '芥川龍之介', '森鴎外'],
        byIds: {
          '夏目漱石': {
            id: '夏目漱石',
            works: [1, 2,],
          },
          '芥川龍之介': {
            id: '芥川龍之介',
            works: [4, 5,],
          },
          '森鴎外': {
            id: '森鴎外',
            works: [3,],
          },
        },
        hasAndBelongsToMany: {
          friends: {
            associationForeignKey: 'rhs',
            foreignKey: 'lhs',
            joinName: 'connection',
            theirName: 'authors'
          }
        },
      }
    },
    works: {
      namespaced: true,
      state: {
        allIds: [1, 2, 3, 4, 5],
        byIds: {
          1: {
            id: 1,
            title: '我輩は猫である',
            authorId: '夏目漱石',
          },
          2: {
            id: 2,
            title: 'こころ',
            authorId: '夏目漱石',
          },
          3: {
            id: 3,
            title: '雁',
            authorId: '森鴎外',
          },
          4: {
            id: 4,
            title: '蜘蛛の糸',
            authorId: '芥川龍之介',
          },
          5: {
            id: 5,
            title: '藪の中',
            authorId: '芥川龍之介',
          }
        }
      }
    },
    connection: {
      namespaced: true,
      state: {
        allIds: [1],
        byIds: {
          1: {
            id: 1,
            lhs: '夏目漱石',
            rhs: '芥川龍之介',
          }
        },
      }
    }
  },
  state: {},
}
