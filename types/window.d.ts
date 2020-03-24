import { Store, StoreOptions } from "vuex";

interface StoreCtr {
  new<S>(options: StoreOptions<S>): Store<S>;
}

declare global {
  interface Window {
    Vuex: {
      Store: StoreCtr
    },
  }
}
