export default function WasmMemory() {
  let memory = null;

  let dataview = null, datamem = null;
  let int8view = null, int8mem = null;
  let uint8view = null, uint8mem = null;
  let int16view = null, int16mem = null;
  let uint16view = null, uint16mem = null;
  let int32view = null, int32mem = null;
  let uint32view = null, uint32mem = null;
  let float32view = null, float32mem = null;
  let float64view = null, float64mem = null;

  let textEncoder = new TextEncoder(), textDecoder = new TextDecoder();

  function getMemory() {
    return memory;
  }
  function setMemory(mem) {
    memory = mem;
  }

  function arrayBuffer() {
    return memory.buffer;
  }

  function dataView() {
    if (datamem === memory.buffer) {
      return dataview;
    }
    datamem = memory.buffer;
    return dataview = new DataView(memory.buffer);
  }
  function int8View() {
    if (int8mem === memory.buffer) {
      return int8view;
    }
    int8mem = memory.buffer;
    return int8view = new Int8Array(memory.buffer);
  }
  function uint8View() {
    if (uint8mem === memory.buffer) {
      return uint8view;
    }
    uint8mem = memory.buffer;
    return uint8view = new Uint8Array(memory.buffer);
  }
  function int16View() {
    if (int16mem === memory.buffer) {
      return int16view;
    }
    int16mem = memory.buffer;
    return int16view = new Int16Array(memory.buffer);
  }
  function uint16View() {
    if (uint16mem === memory.buffer) {
      return uint16view;
    }
    uint16mem = memory.buffer;
    return uint16view = new Uint16Array(memory.buffer);
  }
  function int32View() {
    if (int32mem === memory.buffer) {
      return int32view;
    }
    int32mem = memory.buffer;
    return int32view = new Int32Array(memory.buffer);
  }
  function uint32View() {
    if (uint32mem === memory.buffer) {
      return uint32view;
    }
    uint32mem = memory.buffer;
    return uint32view = new Uint32Array(memory.buffer);
  }
  function float32View() {
    if (float32mem === memory.buffer) {
      return float32view;
    }
    float32mem = memory.buffer;
    return float32view = new Float32Array(memory.buffer);
  }
  function float64View() {
    if (float64mem === memory.buffer) {
      return float64view;
    }
    float64mem = memory.buffer;
    return float64view = new Float64Array(memory.buffer);
  }

  function readString(data) {
    const view = uint8View();
    const end = view.indexOf(0, data);
    return textDecoder.decode(view.subarray(data, end));
  }
  function writeString(string, maxLength, length, data) {
    const array = textEncoder.encode(string);
    if (array.length < maxLength) {
      const view = uint8View();
      view.set(array, data);
      view[data + array.length] = 0;
    }
    if (length) {
      uint32View()[length] = array.length;
    }
  }

  function writeInt32(value, offset) {
    if (value.hasOwnProperty("length")) {
      int32View().set(value, offset >> 2);
    } else {
      int32View()[offset >> 2] = value;
    }
  }
  function writeUint32(value, offset) {
    if (value.hasOwnProperty("length")) {
      uint32View().set(value, offset >> 2);
    } else {
      uint32View()[offset >> 2] = value;
    }
  }
  function writeFloat32(value, offset) {
    if (value.hasOwnProperty("length")) {
      float32View().set(value, offset >> 2);
    } else {
      float32View()[offset >> 2] = value;
    }
  }
  function writeFloat64(value, offset) {
    if (value.hasOwnProperty("length")) {
      float64View().set(value, offset >> 3);
    } else {
      float64View()[offset >> 3] = value;
    }
  }

  return {
    getMemory, setMemory,

    arrayBuffer, dataView,
    int8View, uint8View,
    int16View, uint16View,
    int32View, uint32View,
    float32View, float64View,

    readString, writeString,
    writeInt32, writeUint32,
    writeFloat32, writeFloat64,
  }
}
