export default function deepClone(obj) {
  const map = new Map();
  return (function clone(obj) {
    var dst;
    if (!obj || typeof obj !== "object") {
      return obj;
    } else if (map.has(obj)) {
      return map.get(obj);
    } else switch (Object.prototype.toString.call(obj)) {
    case "[object Object]":
    case "[object Array]":
      dst = Array.isArray(obj) ? [] : Object.create(Object.getPrototypeOf(obj));
      map.set(obj, dst);
      Object.getOwnPropertyNames(obj).forEach(name => {
        dst[name] = clone(obj[name]);
      });
      return dst;
    case "[object WeakMap]":
    case "[object WeakSet]":
      return obj;
    case "[object Map]":
      dst = new Map();
      map.set(obj, dst);
      clone([...obj.entries()]).forEach(([key, value]) => dst.set(key, value));
      return dst;
    case "[object Set]":
      dst = new Set();
      map.set(obj, dst);
      clone([...obj.values()]).forEach(value => dst.add(value));
      return dst;
    default:
      return new obj.constructor(obj.valueOf());
    }
  })(obj);
}
