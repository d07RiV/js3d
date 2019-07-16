export default class Performance {
  total = 0;
  broad = 0;
  narrow = 0;
  resolve = 0;
  position = 0;

  add(name, amount) {
    this[name] = this[name] * 0.9 + amount * 0.1;
  }
}
