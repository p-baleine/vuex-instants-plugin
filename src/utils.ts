export function assert(
  condition: () => boolean,
  msg = '', errorCls = TypeError) {
  if (!condition()) {
    throw new errorCls(msg)
  }
}
