var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../Output/Target/Microsoft/VSCode/vs/base/common/collections.js
var _a;
function groupBy(data, groupFn) {
  const result = /* @__PURE__ */ Object.create(null);
  for (const element of data) {
    const key = groupFn(element);
    let target = result[key];
    if (!target) {
      target = result[key] = [];
    }
    target.push(element);
  }
  return result;
}
__name(groupBy, "groupBy");
function groupByMap(data, groupFn) {
  const result = /* @__PURE__ */ new Map();
  for (const element of data) {
    const key = groupFn(element);
    let target = result.get(key);
    if (!target) {
      target = [];
      result.set(key, target);
    }
    target.push(element);
  }
  return result;
}
__name(groupByMap, "groupByMap");
function diffSets(before, after) {
  const removed = [];
  const added = [];
  for (const element of before) {
    if (!after.has(element)) {
      removed.push(element);
    }
  }
  for (const element of after) {
    if (!before.has(element)) {
      added.push(element);
    }
  }
  return { removed, added };
}
__name(diffSets, "diffSets");
function diffMaps(before, after) {
  const removed = [];
  const added = [];
  for (const [index2, value] of before) {
    if (!after.has(index2)) {
      removed.push(value);
    }
  }
  for (const [index2, value] of after) {
    if (!before.has(index2)) {
      added.push(value);
    }
  }
  return { removed, added };
}
__name(diffMaps, "diffMaps");
function intersection(setA, setB) {
  const result = /* @__PURE__ */ new Set();
  for (const elem of setB) {
    if (setA.has(elem)) {
      result.add(elem);
    }
  }
  return result;
}
__name(intersection, "intersection");
var SetWithKey = class {
  static {
    __name(this, "SetWithKey");
  }
  static {
    _a = Symbol.toStringTag;
  }
  constructor(values, toKey) {
    this.toKey = toKey;
    this._map = /* @__PURE__ */ new Map();
    this[_a] = "SetWithKey";
    for (const value of values) {
      this.add(value);
    }
  }
  get size() {
    return this._map.size;
  }
  add(value) {
    const key = this.toKey(value);
    this._map.set(key, value);
    return this;
  }
  delete(value) {
    return this._map.delete(this.toKey(value));
  }
  has(value) {
    return this._map.has(this.toKey(value));
  }
  *entries() {
    for (const entry of this._map.values()) {
      yield [entry, entry];
    }
  }
  keys() {
    return this.values();
  }
  *values() {
    for (const entry of this._map.values()) {
      yield entry;
    }
  }
  clear() {
    this._map.clear();
  }
  forEach(callbackfn, thisArg) {
    this._map.forEach((entry) => callbackfn.call(thisArg, entry, entry, this));
  }
  [Symbol.iterator]() {
    return this.values();
  }
};

// ../Output/Target/Microsoft/VSCode/vs/base/common/errors.js
var ErrorHandler = class {
  static {
    __name(this, "ErrorHandler");
  }
  constructor() {
    this.listeners = [];
    this.unexpectedErrorHandler = function(e) {
      setTimeout(() => {
        if (e.stack) {
          if (ErrorNoTelemetry.isErrorNoTelemetry(e)) {
            throw new ErrorNoTelemetry(e.message + "\n\n" + e.stack);
          }
          throw new Error(e.message + "\n\n" + e.stack);
        }
        throw e;
      }, 0);
    };
  }
  addListener(listener) {
    this.listeners.push(listener);
    return () => {
      this._removeListener(listener);
    };
  }
  emit(e) {
    this.listeners.forEach((listener) => {
      listener(e);
    });
  }
  _removeListener(listener) {
    this.listeners.splice(this.listeners.indexOf(listener), 1);
  }
  setUnexpectedErrorHandler(newUnexpectedErrorHandler) {
    this.unexpectedErrorHandler = newUnexpectedErrorHandler;
  }
  getUnexpectedErrorHandler() {
    return this.unexpectedErrorHandler;
  }
  onUnexpectedError(e) {
    this.unexpectedErrorHandler(e);
    this.emit(e);
  }
  // For external errors, we don't want the listeners to be called
  onUnexpectedExternalError(e) {
    this.unexpectedErrorHandler(e);
  }
};
var errorHandler = new ErrorHandler();
function setUnexpectedErrorHandler(newUnexpectedErrorHandler) {
  errorHandler.setUnexpectedErrorHandler(newUnexpectedErrorHandler);
}
__name(setUnexpectedErrorHandler, "setUnexpectedErrorHandler");
function isSigPipeError(e) {
  if (!e || typeof e !== "object") {
    return false;
  }
  const cast = e;
  return cast.code === "EPIPE" && cast.syscall?.toUpperCase() === "WRITE";
}
__name(isSigPipeError, "isSigPipeError");
function onBugIndicatingError(e) {
  errorHandler.onUnexpectedError(e);
  return void 0;
}
__name(onBugIndicatingError, "onBugIndicatingError");
function onUnexpectedError(e) {
  if (!isCancellationError(e)) {
    errorHandler.onUnexpectedError(e);
  }
  return void 0;
}
__name(onUnexpectedError, "onUnexpectedError");
function onUnexpectedExternalError(e) {
  if (!isCancellationError(e)) {
    errorHandler.onUnexpectedExternalError(e);
  }
  return void 0;
}
__name(onUnexpectedExternalError, "onUnexpectedExternalError");
function transformErrorForSerialization(error) {
  if (error instanceof Error) {
    const { name, message, cause } = error;
    const stack = error.stacktrace || error.stack;
    return {
      $isError: true,
      name,
      message,
      stack,
      noTelemetry: ErrorNoTelemetry.isErrorNoTelemetry(error),
      cause: cause ? transformErrorForSerialization(cause) : void 0,
      code: error.code
    };
  }
  return error;
}
__name(transformErrorForSerialization, "transformErrorForSerialization");
function transformErrorFromSerialization(data) {
  let error;
  if (data.noTelemetry) {
    error = new ErrorNoTelemetry();
  } else {
    error = new Error();
    error.name = data.name;
  }
  error.message = data.message;
  error.stack = data.stack;
  if (data.code) {
    error.code = data.code;
  }
  if (data.cause) {
    error.cause = transformErrorFromSerialization(data.cause);
  }
  return error;
}
__name(transformErrorFromSerialization, "transformErrorFromSerialization");
var canceledName = "Canceled";
function isCancellationError(error) {
  if (error instanceof CancellationError) {
    return true;
  }
  return error instanceof Error && error.name === canceledName && error.message === canceledName;
}
__name(isCancellationError, "isCancellationError");
var CancellationError = class extends Error {
  static {
    __name(this, "CancellationError");
  }
  constructor() {
    super(canceledName);
    this.name = this.message;
  }
};
var PendingMigrationError = class _PendingMigrationError extends Error {
  static {
    __name(this, "PendingMigrationError");
  }
  static {
    this._name = "PendingMigrationError";
  }
  static is(error) {
    return error instanceof _PendingMigrationError || error instanceof Error && error.name === _PendingMigrationError._name;
  }
  constructor(message) {
    super(message);
    this.name = _PendingMigrationError._name;
  }
};
function canceled() {
  const error = new Error(canceledName);
  error.name = error.message;
  return error;
}
__name(canceled, "canceled");
function illegalArgument(name) {
  if (name) {
    return new Error(`Illegal argument: ${name}`);
  } else {
    return new Error("Illegal argument");
  }
}
__name(illegalArgument, "illegalArgument");
function illegalState(name) {
  if (name) {
    return new Error(`Illegal state: ${name}`);
  } else {
    return new Error("Illegal state");
  }
}
__name(illegalState, "illegalState");
var ReadonlyError = class extends TypeError {
  static {
    __name(this, "ReadonlyError");
  }
  constructor(name) {
    super(name ? `${name} is read-only and cannot be changed` : "Cannot change read-only property");
  }
};
function getErrorMessage(err) {
  if (!err) {
    return "Error";
  }
  if (err.message) {
    return err.message;
  }
  if (err.stack) {
    return err.stack.split("\n")[0];
  }
  return String(err);
}
__name(getErrorMessage, "getErrorMessage");
var NotImplementedError = class extends Error {
  static {
    __name(this, "NotImplementedError");
  }
  constructor(message) {
    super("NotImplemented");
    if (message) {
      this.message = message;
    }
  }
};
var NotSupportedError = class extends Error {
  static {
    __name(this, "NotSupportedError");
  }
  constructor(message) {
    super("NotSupported");
    if (message) {
      this.message = message;
    }
  }
};
var ExpectedError = class extends Error {
  static {
    __name(this, "ExpectedError");
  }
  constructor() {
    super(...arguments);
    this.isExpected = true;
  }
};
var ErrorNoTelemetry = class _ErrorNoTelemetry extends Error {
  static {
    __name(this, "ErrorNoTelemetry");
  }
  constructor(msg) {
    super(msg);
    this.name = "CodeExpectedError";
  }
  static fromError(err) {
    if (err instanceof _ErrorNoTelemetry) {
      return err;
    }
    const result = new _ErrorNoTelemetry();
    result.message = err.message;
    result.stack = err.stack;
    return result;
  }
  static isErrorNoTelemetry(err) {
    return err.name === "CodeExpectedError";
  }
};
var BugIndicatingError = class _BugIndicatingError extends Error {
  static {
    __name(this, "BugIndicatingError");
  }
  constructor(message) {
    super(message || "An unexpected bug occurred.");
    Object.setPrototypeOf(this, _BugIndicatingError.prototype);
  }
};

// ../Output/Target/Microsoft/VSCode/vs/base/common/functional.js
function createSingleCallFunction(fn, fnDidRunCallback) {
  const _this = this;
  let didCall = false;
  let result;
  return function() {
    if (didCall) {
      return result;
    }
    didCall = true;
    if (fnDidRunCallback) {
      try {
        result = fn.apply(_this, arguments);
      } finally {
        fnDidRunCallback();
      }
    } else {
      result = fn.apply(_this, arguments);
    }
    return result;
  };
}
__name(createSingleCallFunction, "createSingleCallFunction");

// ../Output/Target/Microsoft/VSCode/vs/base/common/arraysFind.js
function findLast(array, predicate, fromIndex = array.length - 1) {
  const idx = findLastIdx(array, predicate, fromIndex);
  if (idx === -1) {
    return void 0;
  }
  return array[idx];
}
__name(findLast, "findLast");
function findLastIdx(array, predicate, fromIndex = array.length - 1) {
  for (let i = fromIndex; i >= 0; i--) {
    const element = array[i];
    if (predicate(element, i)) {
      return i;
    }
  }
  return -1;
}
__name(findLastIdx, "findLastIdx");
function findFirst(array, predicate, fromIndex = 0) {
  const idx = findFirstIdx(array, predicate, fromIndex);
  if (idx === -1) {
    return void 0;
  }
  return array[idx];
}
__name(findFirst, "findFirst");
function findFirstIdx(array, predicate, fromIndex = 0) {
  for (let i = fromIndex; i < array.length; i++) {
    const element = array[i];
    if (predicate(element, i)) {
      return i;
    }
  }
  return -1;
}
__name(findFirstIdx, "findFirstIdx");
function findLastMonotonous(array, predicate) {
  const idx = findLastIdxMonotonous(array, predicate);
  return idx === -1 ? void 0 : array[idx];
}
__name(findLastMonotonous, "findLastMonotonous");
function findLastIdxMonotonous(array, predicate, startIdx = 0, endIdxEx = array.length) {
  let i = startIdx;
  let j = endIdxEx;
  while (i < j) {
    const k = Math.floor((i + j) / 2);
    if (predicate(array[k])) {
      i = k + 1;
    } else {
      j = k;
    }
  }
  return i - 1;
}
__name(findLastIdxMonotonous, "findLastIdxMonotonous");
function findFirstMonotonous(array, predicate) {
  const idx = findFirstIdxMonotonousOrArrLen(array, predicate);
  return idx === array.length ? void 0 : array[idx];
}
__name(findFirstMonotonous, "findFirstMonotonous");
function findFirstIdxMonotonousOrArrLen(array, predicate, startIdx = 0, endIdxEx = array.length) {
  let i = startIdx;
  let j = endIdxEx;
  while (i < j) {
    const k = Math.floor((i + j) / 2);
    if (predicate(array[k])) {
      j = k;
    } else {
      i = k + 1;
    }
  }
  return i;
}
__name(findFirstIdxMonotonousOrArrLen, "findFirstIdxMonotonousOrArrLen");
function findFirstIdxMonotonous(array, predicate, startIdx = 0, endIdxEx = array.length) {
  const idx = findFirstIdxMonotonousOrArrLen(array, predicate, startIdx, endIdxEx);
  return idx === array.length ? -1 : idx;
}
__name(findFirstIdxMonotonous, "findFirstIdxMonotonous");
var MonotonousArray = class _MonotonousArray {
  static {
    __name(this, "MonotonousArray");
  }
  static {
    this.assertInvariants = false;
  }
  constructor(_array) {
    this._array = _array;
    this._findLastMonotonousLastIdx = 0;
  }
  /**
   * The predicate must be monotonous, i.e. `arr.map(predicate)` must be like `[true, ..., true, false, ..., false]`!
   * For subsequent calls, current predicate must be weaker than (or equal to) the previous predicate, i.e. more entries must be `true`.
   */
  findLastMonotonous(predicate) {
    if (_MonotonousArray.assertInvariants) {
      if (this._prevFindLastPredicate) {
        for (const item of this._array) {
          if (this._prevFindLastPredicate(item) && !predicate(item)) {
            throw new Error("MonotonousArray: current predicate must be weaker than (or equal to) the previous predicate.");
          }
        }
      }
      this._prevFindLastPredicate = predicate;
    }
    const idx = findLastIdxMonotonous(this._array, predicate, this._findLastMonotonousLastIdx);
    this._findLastMonotonousLastIdx = idx + 1;
    return idx === -1 ? void 0 : this._array[idx];
  }
};
function findFirstMax(array, comparator) {
  if (array.length === 0) {
    return void 0;
  }
  let max = array[0];
  for (let i = 1; i < array.length; i++) {
    const item = array[i];
    if (comparator(item, max) > 0) {
      max = item;
    }
  }
  return max;
}
__name(findFirstMax, "findFirstMax");
function findLastMax(array, comparator) {
  if (array.length === 0) {
    return void 0;
  }
  let max = array[0];
  for (let i = 1; i < array.length; i++) {
    const item = array[i];
    if (comparator(item, max) >= 0) {
      max = item;
    }
  }
  return max;
}
__name(findLastMax, "findLastMax");
function findFirstMin(array, comparator) {
  return findFirstMax(array, (a, b) => -comparator(a, b));
}
__name(findFirstMin, "findFirstMin");
function findMaxIdx(array, comparator) {
  if (array.length === 0) {
    return -1;
  }
  let maxIdx = 0;
  for (let i = 1; i < array.length; i++) {
    const item = array[i];
    if (comparator(item, array[maxIdx]) > 0) {
      maxIdx = i;
    }
  }
  return maxIdx;
}
__name(findMaxIdx, "findMaxIdx");
function mapFindFirst(items, mapFn) {
  for (const value of items) {
    const mapped = mapFn(value);
    if (mapped !== void 0) {
      return mapped;
    }
  }
  return void 0;
}
__name(mapFindFirst, "mapFindFirst");

// ../Output/Target/Microsoft/VSCode/vs/base/common/arrays.js
function topStep(array, compare, result, i, m) {
  for (const n = result.length; i < m; i++) {
    const element = array[i];
    if (compare(element, result[n - 1]) < 0) {
      result.pop();
      const j = findFirstIdxMonotonousOrArrLen(result, (e) => compare(element, e) < 0);
      result.splice(j, 0, element);
    }
  }
}
__name(topStep, "topStep");
function getActualStartIndex(array, start) {
  return start < 0 ? Math.max(start + array.length, 0) : Math.min(start, array.length);
}
__name(getActualStartIndex, "getActualStartIndex");
function tail(arr) {
  if (arr.length === 0) {
    throw new Error("Invalid tail call");
  }
  return [arr.slice(0, arr.length - 1), arr[arr.length - 1]];
}
__name(tail, "tail");
function equals(one, other, itemEquals = (a, b) => a === b) {
  if (one === other) {
    return true;
  }
  if (!one || !other) {
    return false;
  }
  if (one.length !== other.length) {
    return false;
  }
  for (let i = 0, len = one.length; i < len; i++) {
    if (!itemEquals(one[i], other[i])) {
      return false;
    }
  }
  return true;
}
__name(equals, "equals");
function removeFastWithoutKeepingOrder(array, index2) {
  const last = array.length - 1;
  if (index2 < last) {
    array[index2] = array[last];
  }
  array.pop();
}
__name(removeFastWithoutKeepingOrder, "removeFastWithoutKeepingOrder");
function binarySearch(array, key, comparator) {
  return binarySearch2(array.length, (i) => comparator(array[i], key));
}
__name(binarySearch, "binarySearch");
function binarySearch2(length, compareToKey) {
  let low = 0, high = length - 1;
  while (low <= high) {
    const mid = (low + high) / 2 | 0;
    const comp = compareToKey(mid);
    if (comp < 0) {
      low = mid + 1;
    } else if (comp > 0) {
      high = mid - 1;
    } else {
      return mid;
    }
  }
  return -(low + 1);
}
__name(binarySearch2, "binarySearch2");
function quickSelect(nth, data, compare) {
  nth = nth | 0;
  if (nth >= data.length) {
    throw new TypeError("invalid index");
  }
  const pivotValue = data[Math.floor(data.length * Math.random())];
  const lower = [];
  const higher = [];
  const pivots = [];
  for (const value of data) {
    const val = compare(value, pivotValue);
    if (val < 0) {
      lower.push(value);
    } else if (val > 0) {
      higher.push(value);
    } else {
      pivots.push(value);
    }
  }
  if (nth < lower.length) {
    return quickSelect(nth, lower, compare);
  } else if (nth < lower.length + pivots.length) {
    return pivots[0];
  } else {
    return quickSelect(nth - (lower.length + pivots.length), higher, compare);
  }
}
__name(quickSelect, "quickSelect");
function groupBy2(data, compare) {
  const result = [];
  let currentGroup = void 0;
  for (const element of data.slice(0).sort(compare)) {
    if (!currentGroup || compare(currentGroup[0], element) !== 0) {
      currentGroup = [element];
      result.push(currentGroup);
    } else {
      currentGroup.push(element);
    }
  }
  return result;
}
__name(groupBy2, "groupBy");
function* groupAdjacentBy(items, shouldBeGrouped) {
  let currentGroup;
  let last;
  for (const item of items) {
    if (last !== void 0 && shouldBeGrouped(last, item)) {
      currentGroup.push(item);
    } else {
      if (currentGroup) {
        yield currentGroup;
      }
      currentGroup = [item];
    }
    last = item;
  }
  if (currentGroup) {
    yield currentGroup;
  }
}
__name(groupAdjacentBy, "groupAdjacentBy");
function forEachAdjacent(arr, f) {
  for (let i = 0; i <= arr.length; i++) {
    f(i === 0 ? void 0 : arr[i - 1], i === arr.length ? void 0 : arr[i]);
  }
}
__name(forEachAdjacent, "forEachAdjacent");
function forEachWithNeighbors(arr, f) {
  for (let i = 0; i < arr.length; i++) {
    f(i === 0 ? void 0 : arr[i - 1], arr[i], i + 1 === arr.length ? void 0 : arr[i + 1]);
  }
}
__name(forEachWithNeighbors, "forEachWithNeighbors");
function concatArrays(...arrays) {
  return [].concat(...arrays);
}
__name(concatArrays, "concatArrays");
function sortedDiff(before, after, compare) {
  const result = [];
  function pushSplice(start, deleteCount, toInsert) {
    if (deleteCount === 0 && toInsert.length === 0) {
      return;
    }
    const latest = result[result.length - 1];
    if (latest && latest.start + latest.deleteCount === start) {
      latest.deleteCount += deleteCount;
      latest.toInsert.push(...toInsert);
    } else {
      result.push({ start, deleteCount, toInsert });
    }
  }
  __name(pushSplice, "pushSplice");
  let beforeIdx = 0;
  let afterIdx = 0;
  while (true) {
    if (beforeIdx === before.length) {
      pushSplice(beforeIdx, 0, after.slice(afterIdx));
      break;
    }
    if (afterIdx === after.length) {
      pushSplice(beforeIdx, before.length - beforeIdx, []);
      break;
    }
    const beforeElement = before[beforeIdx];
    const afterElement = after[afterIdx];
    const n = compare(beforeElement, afterElement);
    if (n === 0) {
      beforeIdx += 1;
      afterIdx += 1;
    } else if (n < 0) {
      pushSplice(beforeIdx, 1, []);
      beforeIdx += 1;
    } else if (n > 0) {
      pushSplice(beforeIdx, 0, [afterElement]);
      afterIdx += 1;
    }
  }
  return result;
}
__name(sortedDiff, "sortedDiff");
function delta(before, after, compare) {
  const splices = sortedDiff(before, after, compare);
  const removed = [];
  const added = [];
  for (const splice2 of splices) {
    removed.push(...before.slice(splice2.start, splice2.start + splice2.deleteCount));
    added.push(...splice2.toInsert);
  }
  return { removed, added };
}
__name(delta, "delta");
function top(array, compare, n) {
  if (n === 0) {
    return [];
  }
  const result = array.slice(0, n).sort(compare);
  topStep(array, compare, result, n, array.length);
  return result;
}
__name(top, "top");
function topAsync(array, compare, n, batch, token) {
  if (n === 0) {
    return Promise.resolve([]);
  }
  return new Promise((resolve, reject) => {
    (async () => {
      const o = array.length;
      const result = array.slice(0, n).sort(compare);
      for (let i = n, m = Math.min(n + batch, o); i < o; i = m, m = Math.min(m + batch, o)) {
        if (i > n) {
          await new Promise((resolve2) => setTimeout(resolve2));
        }
        if (token && token.isCancellationRequested) {
          throw new CancellationError();
        }
        topStep(array, compare, result, i, m);
      }
      return result;
    })().then(resolve, reject);
  });
}
__name(topAsync, "topAsync");
function coalesce(array) {
  return array.filter((e) => !!e);
}
__name(coalesce, "coalesce");
function coalesceInPlace(array) {
  let to = 0;
  for (let i = 0; i < array.length; i++) {
    if (!!array[i]) {
      array[to] = array[i];
      to += 1;
    }
  }
  array.length = to;
}
__name(coalesceInPlace, "coalesceInPlace");
function move(array, from, to) {
  array.splice(to, 0, array.splice(from, 1)[0]);
}
__name(move, "move");
function isFalsyOrEmpty(obj) {
  return !Array.isArray(obj) || obj.length === 0;
}
__name(isFalsyOrEmpty, "isFalsyOrEmpty");
function isNonEmptyArray(obj) {
  return Array.isArray(obj) && obj.length > 0;
}
__name(isNonEmptyArray, "isNonEmptyArray");
function distinct(array, keyFn = (value) => value) {
  const seen = /* @__PURE__ */ new Set();
  return array.filter((element) => {
    const key = keyFn(element);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
__name(distinct, "distinct");
function uniqueFilter(keyFn) {
  const seen = /* @__PURE__ */ new Set();
  return (element) => {
    const key = keyFn(element);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  };
}
__name(uniqueFilter, "uniqueFilter");
function commonPrefixLength(one, other, equals2 = (a, b) => a === b) {
  let result = 0;
  for (let i = 0, len = Math.min(one.length, other.length); i < len && equals2(one[i], other[i]); i++) {
    result++;
  }
  return result;
}
__name(commonPrefixLength, "commonPrefixLength");
function range(arg, to) {
  let from = typeof to === "number" ? arg : 0;
  if (typeof to === "number") {
    from = arg;
  } else {
    from = 0;
    to = arg;
  }
  const result = [];
  if (from <= to) {
    for (let i = from; i < to; i++) {
      result.push(i);
    }
  } else {
    for (let i = from; i > to; i--) {
      result.push(i);
    }
  }
  return result;
}
__name(range, "range");
function index(array, indexer, mapper) {
  return array.reduce((r, t) => {
    r[indexer(t)] = mapper ? mapper(t) : t;
    return r;
  }, /* @__PURE__ */ Object.create(null));
}
__name(index, "index");
function insert(array, element) {
  array.push(element);
  return () => remove(array, element);
}
__name(insert, "insert");
function remove(array, element) {
  const index2 = array.indexOf(element);
  if (index2 > -1) {
    array.splice(index2, 1);
    return element;
  }
  return void 0;
}
__name(remove, "remove");
function arrayInsert(target, insertIndex, insertArr) {
  const before = target.slice(0, insertIndex);
  const after = target.slice(insertIndex);
  return before.concat(insertArr, after);
}
__name(arrayInsert, "arrayInsert");
function shuffle(array, _seed) {
  let rand;
  if (typeof _seed === "number") {
    let seed = _seed;
    rand = /* @__PURE__ */ __name(() => {
      const x = Math.sin(seed++) * 179426549;
      return x - Math.floor(x);
    }, "rand");
  } else {
    rand = Math.random;
  }
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}
__name(shuffle, "shuffle");
function pushToStart(arr, value) {
  const index2 = arr.indexOf(value);
  if (index2 > -1) {
    arr.splice(index2, 1);
    arr.unshift(value);
  }
}
__name(pushToStart, "pushToStart");
function pushToEnd(arr, value) {
  const index2 = arr.indexOf(value);
  if (index2 > -1) {
    arr.splice(index2, 1);
    arr.push(value);
  }
}
__name(pushToEnd, "pushToEnd");
function pushMany(arr, items) {
  for (const item of items) {
    arr.push(item);
  }
}
__name(pushMany, "pushMany");
function mapArrayOrNot(items, fn) {
  return Array.isArray(items) ? items.map(fn) : fn(items);
}
__name(mapArrayOrNot, "mapArrayOrNot");
function mapFilter(array, fn) {
  const result = [];
  for (const item of array) {
    const mapped = fn(item);
    if (mapped !== void 0) {
      result.push(mapped);
    }
  }
  return result;
}
__name(mapFilter, "mapFilter");
function withoutDuplicates(array) {
  const s = new Set(array);
  return Array.from(s);
}
__name(withoutDuplicates, "withoutDuplicates");
function asArray(x) {
  return Array.isArray(x) ? x : [x];
}
__name(asArray, "asArray");
function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
__name(getRandomElement, "getRandomElement");
function insertInto(array, start, newItems) {
  const startIdx = getActualStartIndex(array, start);
  const originalLength = array.length;
  const newItemsLength = newItems.length;
  array.length = originalLength + newItemsLength;
  for (let i = originalLength - 1; i >= startIdx; i--) {
    array[i + newItemsLength] = array[i];
  }
  for (let i = 0; i < newItemsLength; i++) {
    array[i + startIdx] = newItems[i];
  }
}
__name(insertInto, "insertInto");
function splice(array, start, deleteCount, newItems) {
  const index2 = getActualStartIndex(array, start);
  let result = array.splice(index2, deleteCount);
  if (result === void 0) {
    result = [];
  }
  insertInto(array, index2, newItems);
  return result;
}
__name(splice, "splice");
var CompareResult;
(function(CompareResult2) {
  function isLessThan(result) {
    return result < 0;
  }
  __name(isLessThan, "isLessThan");
  CompareResult2.isLessThan = isLessThan;
  function isLessThanOrEqual(result) {
    return result <= 0;
  }
  __name(isLessThanOrEqual, "isLessThanOrEqual");
  CompareResult2.isLessThanOrEqual = isLessThanOrEqual;
  function isGreaterThan(result) {
    return result > 0;
  }
  __name(isGreaterThan, "isGreaterThan");
  CompareResult2.isGreaterThan = isGreaterThan;
  function isNeitherLessOrGreaterThan(result) {
    return result === 0;
  }
  __name(isNeitherLessOrGreaterThan, "isNeitherLessOrGreaterThan");
  CompareResult2.isNeitherLessOrGreaterThan = isNeitherLessOrGreaterThan;
  CompareResult2.greaterThan = 1;
  CompareResult2.lessThan = -1;
  CompareResult2.neitherLessOrGreaterThan = 0;
})(CompareResult || (CompareResult = {}));
function compareBy(selector, comparator) {
  return (a, b) => comparator(selector(a), selector(b));
}
__name(compareBy, "compareBy");
function tieBreakComparators(...comparators) {
  return (item1, item2) => {
    for (const comparator of comparators) {
      const result = comparator(item1, item2);
      if (!CompareResult.isNeitherLessOrGreaterThan(result)) {
        return result;
      }
    }
    return CompareResult.neitherLessOrGreaterThan;
  };
}
__name(tieBreakComparators, "tieBreakComparators");
var numberComparator = /* @__PURE__ */ __name((a, b) => a - b, "numberComparator");
var booleanComparator = /* @__PURE__ */ __name((a, b) => numberComparator(a ? 1 : 0, b ? 1 : 0), "booleanComparator");
function reverseOrder(comparator) {
  return (a, b) => -comparator(a, b);
}
__name(reverseOrder, "reverseOrder");
function compareUndefinedSmallest(comparator) {
  return (a, b) => {
    if (a === void 0) {
      return b === void 0 ? CompareResult.neitherLessOrGreaterThan : CompareResult.lessThan;
    } else if (b === void 0) {
      return CompareResult.greaterThan;
    }
    return comparator(a, b);
  };
}
__name(compareUndefinedSmallest, "compareUndefinedSmallest");
var ArrayQueue = class {
  static {
    __name(this, "ArrayQueue");
  }
  /**
   * Constructs a queue that is backed by the given array. Runtime is O(1).
  */
  constructor(items) {
    this.firstIdx = 0;
    this.items = items;
    this.lastIdx = this.items.length - 1;
  }
  get length() {
    return this.lastIdx - this.firstIdx + 1;
  }
  /**
   * Consumes elements from the beginning of the queue as long as the predicate returns true.
   * If no elements were consumed, `null` is returned. Has a runtime of O(result.length).
  */
  takeWhile(predicate) {
    let startIdx = this.firstIdx;
    while (startIdx < this.items.length && predicate(this.items[startIdx])) {
      startIdx++;
    }
    const result = startIdx === this.firstIdx ? null : this.items.slice(this.firstIdx, startIdx);
    this.firstIdx = startIdx;
    return result;
  }
  /**
   * Consumes elements from the end of the queue as long as the predicate returns true.
   * If no elements were consumed, `null` is returned.
   * The result has the same order as the underlying array!
  */
  takeFromEndWhile(predicate) {
    let endIdx = this.lastIdx;
    while (endIdx >= 0 && predicate(this.items[endIdx])) {
      endIdx--;
    }
    const result = endIdx === this.lastIdx ? null : this.items.slice(endIdx + 1, this.lastIdx + 1);
    this.lastIdx = endIdx;
    return result;
  }
  peek() {
    if (this.length === 0) {
      return void 0;
    }
    return this.items[this.firstIdx];
  }
  peekLast() {
    if (this.length === 0) {
      return void 0;
    }
    return this.items[this.lastIdx];
  }
  dequeue() {
    const result = this.items[this.firstIdx];
    this.firstIdx++;
    return result;
  }
  removeLast() {
    const result = this.items[this.lastIdx];
    this.lastIdx--;
    return result;
  }
  takeCount(count) {
    const result = this.items.slice(this.firstIdx, this.firstIdx + count);
    this.firstIdx += count;
    return result;
  }
};
var CallbackIterable = class _CallbackIterable {
  static {
    __name(this, "CallbackIterable");
  }
  static {
    this.empty = new _CallbackIterable((_callback) => {
    });
  }
  constructor(iterate) {
    this.iterate = iterate;
  }
  forEach(handler) {
    this.iterate((item) => {
      handler(item);
      return true;
    });
  }
  toArray() {
    const result = [];
    this.iterate((item) => {
      result.push(item);
      return true;
    });
    return result;
  }
  filter(predicate) {
    return new _CallbackIterable((cb) => this.iterate((item) => predicate(item) ? cb(item) : true));
  }
  map(mapFn) {
    return new _CallbackIterable((cb) => this.iterate((item) => cb(mapFn(item))));
  }
  some(predicate) {
    let result = false;
    this.iterate((item) => {
      result = predicate(item);
      return !result;
    });
    return result;
  }
  findFirst(predicate) {
    let result;
    this.iterate((item) => {
      if (predicate(item)) {
        result = item;
        return false;
      }
      return true;
    });
    return result;
  }
  findLast(predicate) {
    let result;
    this.iterate((item) => {
      if (predicate(item)) {
        result = item;
      }
      return true;
    });
    return result;
  }
  findLastMaxBy(comparator) {
    let result;
    let first = true;
    this.iterate((item) => {
      if (first || CompareResult.isGreaterThan(comparator(item, result))) {
        first = false;
        result = item;
      }
      return true;
    });
    return result;
  }
};
var Permutation = class _Permutation {
  static {
    __name(this, "Permutation");
  }
  constructor(_indexMap) {
    this._indexMap = _indexMap;
  }
  /**
   * Returns a permutation that sorts the given array according to the given compare function.
   */
  static createSortPermutation(arr, compareFn) {
    const sortIndices = Array.from(arr.keys()).sort((index1, index2) => compareFn(arr[index1], arr[index2]));
    return new _Permutation(sortIndices);
  }
  /**
   * Returns a new array with the elements of the given array re-arranged according to this permutation.
   */
  apply(arr) {
    return arr.map((_, index2) => arr[this._indexMap[index2]]);
  }
  /**
   * Returns a new permutation that undoes the re-arrangement of this permutation.
  */
  inverse() {
    const inverseIndexMap = this._indexMap.slice();
    for (let i = 0; i < this._indexMap.length; i++) {
      inverseIndexMap[this._indexMap[i]] = i;
    }
    return new _Permutation(inverseIndexMap);
  }
};
async function findAsync(array, predicate) {
  const results = await Promise.all(array.map(async (element, index2) => ({ element, ok: await predicate(element, index2) })));
  return results.find((r) => r.ok)?.element;
}
__name(findAsync, "findAsync");
function sum(array) {
  return array.reduce((acc, value) => acc + value, 0);
}
__name(sum, "sum");
function sumBy(array, selector) {
  return array.reduce((acc, value) => acc + selector(value), 0);
}
__name(sumBy, "sumBy");

// ../Output/Target/Microsoft/VSCode/vs/base/common/map.js
var _a2, _b, _c;
function getOrSet(map, key, value) {
  let result = map.get(key);
  if (result === void 0) {
    result = value;
    map.set(key, result);
  }
  return result;
}
__name(getOrSet, "getOrSet");
function mapToString(map) {
  const entries = [];
  map.forEach((value, key) => {
    entries.push(`${key} => ${value}`);
  });
  return `Map(${map.size}) {${entries.join(", ")}}`;
}
__name(mapToString, "mapToString");
function setToString(set) {
  const entries = [];
  set.forEach((value) => {
    entries.push(value);
  });
  return `Set(${set.size}) {${entries.join(", ")}}`;
}
__name(setToString, "setToString");
var ResourceMapEntry = class {
  static {
    __name(this, "ResourceMapEntry");
  }
  constructor(uri, value) {
    this.uri = uri;
    this.value = value;
  }
};
function isEntries(arg) {
  return Array.isArray(arg);
}
__name(isEntries, "isEntries");
var ResourceMap = class _ResourceMap {
  static {
    __name(this, "ResourceMap");
  }
  static {
    this.defaultToKey = (resource) => resource.toString();
  }
  constructor(arg, toKey) {
    this[_a2] = "ResourceMap";
    if (arg instanceof _ResourceMap) {
      this.map = new Map(arg.map);
      this.toKey = toKey ?? _ResourceMap.defaultToKey;
    } else if (isEntries(arg)) {
      this.map = /* @__PURE__ */ new Map();
      this.toKey = toKey ?? _ResourceMap.defaultToKey;
      for (const [resource, value] of arg) {
        this.set(resource, value);
      }
    } else {
      this.map = /* @__PURE__ */ new Map();
      this.toKey = arg ?? _ResourceMap.defaultToKey;
    }
  }
  set(resource, value) {
    this.map.set(this.toKey(resource), new ResourceMapEntry(resource, value));
    return this;
  }
  get(resource) {
    return this.map.get(this.toKey(resource))?.value;
  }
  has(resource) {
    return this.map.has(this.toKey(resource));
  }
  get size() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  delete(resource) {
    return this.map.delete(this.toKey(resource));
  }
  forEach(clb, thisArg) {
    if (typeof thisArg !== "undefined") {
      clb = clb.bind(thisArg);
    }
    for (const [_, entry] of this.map) {
      clb(entry.value, entry.uri, this);
    }
  }
  *values() {
    for (const entry of this.map.values()) {
      yield entry.value;
    }
  }
  *keys() {
    for (const entry of this.map.values()) {
      yield entry.uri;
    }
  }
  *entries() {
    for (const entry of this.map.values()) {
      yield [entry.uri, entry.value];
    }
  }
  *[(_a2 = Symbol.toStringTag, Symbol.iterator)]() {
    for (const [, entry] of this.map) {
      yield [entry.uri, entry.value];
    }
  }
};
var ResourceSet = class {
  static {
    __name(this, "ResourceSet");
  }
  constructor(entriesOrKey, toKey) {
    this[_b] = "ResourceSet";
    if (!entriesOrKey || typeof entriesOrKey === "function") {
      this._map = new ResourceMap(entriesOrKey);
    } else {
      this._map = new ResourceMap(toKey);
      entriesOrKey.forEach(this.add, this);
    }
  }
  get size() {
    return this._map.size;
  }
  add(value) {
    this._map.set(value, value);
    return this;
  }
  clear() {
    this._map.clear();
  }
  delete(value) {
    return this._map.delete(value);
  }
  forEach(callbackfn, thisArg) {
    this._map.forEach((_value, key) => callbackfn.call(thisArg, key, key, this));
  }
  has(value) {
    return this._map.has(value);
  }
  entries() {
    return this._map.entries();
  }
  keys() {
    return this._map.keys();
  }
  values() {
    return this._map.keys();
  }
  [(_b = Symbol.toStringTag, Symbol.iterator)]() {
    return this.keys();
  }
};
var Touch;
(function(Touch2) {
  Touch2[Touch2["None"] = 0] = "None";
  Touch2[Touch2["AsOld"] = 1] = "AsOld";
  Touch2[Touch2["AsNew"] = 2] = "AsNew";
})(Touch || (Touch = {}));
var LinkedMap = class {
  static {
    __name(this, "LinkedMap");
  }
  constructor() {
    this[_c] = "LinkedMap";
    this._map = /* @__PURE__ */ new Map();
    this._head = void 0;
    this._tail = void 0;
    this._size = 0;
    this._state = 0;
  }
  clear() {
    this._map.clear();
    this._head = void 0;
    this._tail = void 0;
    this._size = 0;
    this._state++;
  }
  isEmpty() {
    return !this._head && !this._tail;
  }
  get size() {
    return this._size;
  }
  get first() {
    return this._head?.value;
  }
  get last() {
    return this._tail?.value;
  }
  has(key) {
    return this._map.has(key);
  }
  get(key, touch = 0) {
    const item = this._map.get(key);
    if (!item) {
      return void 0;
    }
    if (touch !== 0) {
      this.touch(item, touch);
    }
    return item.value;
  }
  set(key, value, touch = 0) {
    let item = this._map.get(key);
    if (item) {
      item.value = value;
      if (touch !== 0) {
        this.touch(item, touch);
      }
    } else {
      item = { key, value, next: void 0, previous: void 0 };
      switch (touch) {
        case 0:
          this.addItemLast(item);
          break;
        case 1:
          this.addItemFirst(item);
          break;
        case 2:
          this.addItemLast(item);
          break;
        default:
          this.addItemLast(item);
          break;
      }
      this._map.set(key, item);
      this._size++;
    }
    return this;
  }
  delete(key) {
    return !!this.remove(key);
  }
  remove(key) {
    const item = this._map.get(key);
    if (!item) {
      return void 0;
    }
    this._map.delete(key);
    this.removeItem(item);
    this._size--;
    return item.value;
  }
  shift() {
    if (!this._head && !this._tail) {
      return void 0;
    }
    if (!this._head || !this._tail) {
      throw new Error("Invalid list");
    }
    const item = this._head;
    this._map.delete(item.key);
    this.removeItem(item);
    this._size--;
    return item.value;
  }
  forEach(callbackfn, thisArg) {
    const state = this._state;
    let current = this._head;
    while (current) {
      if (thisArg) {
        callbackfn.bind(thisArg)(current.value, current.key, this);
      } else {
        callbackfn(current.value, current.key, this);
      }
      if (this._state !== state) {
        throw new Error(`LinkedMap got modified during iteration.`);
      }
      current = current.next;
    }
  }
  keys() {
    const map = this;
    const state = this._state;
    let current = this._head;
    const iterator = {
      [Symbol.iterator]() {
        return iterator;
      },
      [Symbol.dispose]() {
      },
      next() {
        if (map._state !== state) {
          throw new Error(`LinkedMap got modified during iteration.`);
        }
        if (current) {
          const result = { value: current.key, done: false };
          current = current.next;
          return result;
        } else {
          return { value: void 0, done: true };
        }
      }
    };
    return iterator;
  }
  values() {
    const map = this;
    const state = this._state;
    let current = this._head;
    const iterator = {
      [Symbol.iterator]() {
        return iterator;
      },
      [Symbol.dispose]() {
      },
      next() {
        if (map._state !== state) {
          throw new Error(`LinkedMap got modified during iteration.`);
        }
        if (current) {
          const result = { value: current.value, done: false };
          current = current.next;
          return result;
        } else {
          return { value: void 0, done: true };
        }
      }
    };
    return iterator;
  }
  entries() {
    const map = this;
    const state = this._state;
    let current = this._head;
    const iterator = {
      [Symbol.iterator]() {
        return iterator;
      },
      [Symbol.dispose]() {
      },
      next() {
        if (map._state !== state) {
          throw new Error(`LinkedMap got modified during iteration.`);
        }
        if (current) {
          const result = { value: [current.key, current.value], done: false };
          current = current.next;
          return result;
        } else {
          return { value: void 0, done: true };
        }
      }
    };
    return iterator;
  }
  [(_c = Symbol.toStringTag, Symbol.iterator)]() {
    return this.entries();
  }
  trimOld(newSize) {
    if (newSize >= this.size) {
      return;
    }
    if (newSize === 0) {
      this.clear();
      return;
    }
    let current = this._head;
    let currentSize = this.size;
    while (current && currentSize > newSize) {
      this._map.delete(current.key);
      current = current.next;
      currentSize--;
    }
    this._head = current;
    this._size = currentSize;
    if (current) {
      current.previous = void 0;
    }
    this._state++;
  }
  trimNew(newSize) {
    if (newSize >= this.size) {
      return;
    }
    if (newSize === 0) {
      this.clear();
      return;
    }
    let current = this._tail;
    let currentSize = this.size;
    while (current && currentSize > newSize) {
      this._map.delete(current.key);
      current = current.previous;
      currentSize--;
    }
    this._tail = current;
    this._size = currentSize;
    if (current) {
      current.next = void 0;
    }
    this._state++;
  }
  addItemFirst(item) {
    if (!this._head && !this._tail) {
      this._tail = item;
    } else if (!this._head) {
      throw new Error("Invalid list");
    } else {
      item.next = this._head;
      this._head.previous = item;
    }
    this._head = item;
    this._state++;
  }
  addItemLast(item) {
    if (!this._head && !this._tail) {
      this._head = item;
    } else if (!this._tail) {
      throw new Error("Invalid list");
    } else {
      item.previous = this._tail;
      this._tail.next = item;
    }
    this._tail = item;
    this._state++;
  }
  removeItem(item) {
    if (item === this._head && item === this._tail) {
      this._head = void 0;
      this._tail = void 0;
    } else if (item === this._head) {
      if (!item.next) {
        throw new Error("Invalid list");
      }
      item.next.previous = void 0;
      this._head = item.next;
    } else if (item === this._tail) {
      if (!item.previous) {
        throw new Error("Invalid list");
      }
      item.previous.next = void 0;
      this._tail = item.previous;
    } else {
      const next = item.next;
      const previous = item.previous;
      if (!next || !previous) {
        throw new Error("Invalid list");
      }
      next.previous = previous;
      previous.next = next;
    }
    item.next = void 0;
    item.previous = void 0;
    this._state++;
  }
  touch(item, touch) {
    if (!this._head || !this._tail) {
      throw new Error("Invalid list");
    }
    if (touch !== 1 && touch !== 2) {
      return;
    }
    if (touch === 1) {
      if (item === this._head) {
        return;
      }
      const next = item.next;
      const previous = item.previous;
      if (item === this._tail) {
        previous.next = void 0;
        this._tail = previous;
      } else {
        next.previous = previous;
        previous.next = next;
      }
      item.previous = void 0;
      item.next = this._head;
      this._head.previous = item;
      this._head = item;
      this._state++;
    } else if (touch === 2) {
      if (item === this._tail) {
        return;
      }
      const next = item.next;
      const previous = item.previous;
      if (item === this._head) {
        next.previous = void 0;
        this._head = next;
      } else {
        next.previous = previous;
        previous.next = next;
      }
      item.next = void 0;
      item.previous = this._tail;
      this._tail.next = item;
      this._tail = item;
      this._state++;
    }
  }
  toJSON() {
    const data = [];
    this.forEach((value, key) => {
      data.push([key, value]);
    });
    return data;
  }
  fromJSON(data) {
    this.clear();
    for (const [key, value] of data) {
      this.set(key, value);
    }
  }
};
var Cache = class extends LinkedMap {
  static {
    __name(this, "Cache");
  }
  constructor(limit, ratio = 1) {
    super();
    this._limit = limit;
    this._ratio = Math.min(Math.max(0, ratio), 1);
  }
  get limit() {
    return this._limit;
  }
  set limit(limit) {
    this._limit = limit;
    this.checkTrim();
  }
  get ratio() {
    return this._ratio;
  }
  set ratio(ratio) {
    this._ratio = Math.min(Math.max(0, ratio), 1);
    this.checkTrim();
  }
  get(key, touch = 2) {
    return super.get(key, touch);
  }
  peek(key) {
    return super.get(
      key,
      0
      /* Touch.None */
    );
  }
  set(key, value) {
    super.set(
      key,
      value,
      2
      /* Touch.AsNew */
    );
    return this;
  }
  checkTrim() {
    if (this.size > this._limit) {
      this.trim(Math.round(this._limit * this._ratio));
    }
  }
};
var LRUCache = class extends Cache {
  static {
    __name(this, "LRUCache");
  }
  constructor(limit, ratio = 1) {
    super(limit, ratio);
  }
  trim(newSize) {
    this.trimOld(newSize);
  }
  set(key, value) {
    super.set(key, value);
    this.checkTrim();
    return this;
  }
};
var MRUCache = class extends Cache {
  static {
    __name(this, "MRUCache");
  }
  constructor(limit, ratio = 1) {
    super(limit, ratio);
  }
  trim(newSize) {
    this.trimNew(newSize);
  }
  set(key, value) {
    if (this._limit <= this.size && !this.has(key)) {
      this.trim(Math.round(this._limit * this._ratio) - 1);
    }
    super.set(key, value);
    return this;
  }
};
var CounterSet = class {
  static {
    __name(this, "CounterSet");
  }
  constructor() {
    this.map = /* @__PURE__ */ new Map();
  }
  add(value) {
    this.map.set(value, (this.map.get(value) || 0) + 1);
    return this;
  }
  delete(value) {
    let counter = this.map.get(value) || 0;
    if (counter === 0) {
      return false;
    }
    counter--;
    if (counter === 0) {
      this.map.delete(value);
    } else {
      this.map.set(value, counter);
    }
    return true;
  }
  has(value) {
    return this.map.has(value);
  }
};
var BidirectionalMap = class {
  static {
    __name(this, "BidirectionalMap");
  }
  constructor(entries) {
    this._m1 = /* @__PURE__ */ new Map();
    this._m2 = /* @__PURE__ */ new Map();
    if (entries) {
      for (const [key, value] of entries) {
        this.set(key, value);
      }
    }
  }
  clear() {
    this._m1.clear();
    this._m2.clear();
  }
  set(key, value) {
    this._m1.set(key, value);
    this._m2.set(value, key);
  }
  get(key) {
    return this._m1.get(key);
  }
  getKey(value) {
    return this._m2.get(value);
  }
  delete(key) {
    const value = this._m1.get(key);
    if (value === void 0) {
      return false;
    }
    this._m1.delete(key);
    this._m2.delete(value);
    return true;
  }
  forEach(callbackfn, thisArg) {
    this._m1.forEach((value, key) => {
      callbackfn.call(thisArg, value, key, this);
    });
  }
  keys() {
    return this._m1.keys();
  }
  values() {
    return this._m1.values();
  }
};
var SetMap = class {
  static {
    __name(this, "SetMap");
  }
  constructor() {
    this.map = /* @__PURE__ */ new Map();
  }
  add(key, value) {
    let values = this.map.get(key);
    if (!values) {
      values = /* @__PURE__ */ new Set();
      this.map.set(key, values);
    }
    values.add(value);
  }
  delete(key, value) {
    const values = this.map.get(key);
    if (!values) {
      return;
    }
    values.delete(value);
    if (values.size === 0) {
      this.map.delete(key);
    }
  }
  forEach(key, fn) {
    const values = this.map.get(key);
    if (!values) {
      return;
    }
    values.forEach(fn);
  }
  get(key) {
    const values = this.map.get(key);
    if (!values) {
      return /* @__PURE__ */ new Set();
    }
    return values;
  }
};
function mapsStrictEqualIgnoreOrder(a, b) {
  if (a === b) {
    return true;
  }
  if (a.size !== b.size) {
    return false;
  }
  for (const [key, value] of a) {
    if (!b.has(key) || b.get(key) !== value) {
      return false;
    }
  }
  for (const [key] of b) {
    if (!a.has(key)) {
      return false;
    }
  }
  return true;
}
__name(mapsStrictEqualIgnoreOrder, "mapsStrictEqualIgnoreOrder");
var NKeyMap = class {
  static {
    __name(this, "NKeyMap");
  }
  constructor() {
    this._data = /* @__PURE__ */ new Map();
  }
  /**
   * Sets a value on the map. Note that unlike a standard `Map`, the first argument is the value.
   * This is because the spread operator is used for the keys and must be last..
   * @param value The value to set.
   * @param keys The keys for the value.
   */
  set(value, ...keys) {
    let currentMap = this._data;
    for (let i = 0; i < keys.length - 1; i++) {
      let nextMap = currentMap.get(keys[i]);
      if (nextMap === void 0) {
        nextMap = /* @__PURE__ */ new Map();
        currentMap.set(keys[i], nextMap);
      }
      currentMap = nextMap;
    }
    currentMap.set(keys[keys.length - 1], value);
  }
  get(...keys) {
    let currentMap = this._data;
    for (let i = 0; i < keys.length - 1; i++) {
      const nextMap = currentMap.get(keys[i]);
      if (nextMap === void 0) {
        return void 0;
      }
      currentMap = nextMap;
    }
    return currentMap.get(keys[keys.length - 1]);
  }
  clear() {
    this._data.clear();
  }
  *values() {
    function* iterate(map) {
      for (const value of map.values()) {
        if (value instanceof Map) {
          yield* iterate(value);
        } else {
          yield value;
        }
      }
    }
    __name(iterate, "iterate");
    yield* iterate(this._data);
  }
  /**
   * Get a textual representation of the map for debugging purposes.
   */
  toString() {
    const printMap = /* @__PURE__ */ __name((map, depth) => {
      let result = "";
      for (const [key, value] of map) {
        result += `${"  ".repeat(depth)}${key}: `;
        if (value instanceof Map) {
          result += "\n" + printMap(value, depth + 1);
        } else {
          result += `${value}
`;
        }
      }
      return result;
    }, "printMap");
    return printMap(this._data, 0);
  }
};

// ../Output/Target/Microsoft/VSCode/vs/base/common/assert.js
function ok(value, message) {
  if (!value) {
    throw new Error(message ? `Assertion failed (${message})` : "Assertion Failed");
  }
}
__name(ok, "ok");
function assertNever(value, message = "Unreachable") {
  throw new Error(message);
}
__name(assertNever, "assertNever");
function softAssertNever(value) {
}
__name(softAssertNever, "softAssertNever");
function assert(condition, messageOrError = "unexpected state") {
  if (!condition) {
    const errorToThrow = typeof messageOrError === "string" ? new BugIndicatingError(`Assertion Failed: ${messageOrError}`) : messageOrError;
    throw errorToThrow;
  }
}
__name(assert, "assert");
function softAssert(condition, message = "Soft Assertion Failed") {
  if (!condition) {
    onUnexpectedError(new BugIndicatingError(message));
  }
}
__name(softAssert, "softAssert");
function assertFn(condition) {
  if (!condition()) {
    debugger;
    condition();
    onUnexpectedError(new BugIndicatingError("Assertion Failed"));
  }
}
__name(assertFn, "assertFn");
function checkAdjacentItems(items, predicate) {
  let i = 0;
  while (i < items.length - 1) {
    const a = items[i];
    const b = items[i + 1];
    if (!predicate(a, b)) {
      return false;
    }
    i++;
  }
  return true;
}
__name(checkAdjacentItems, "checkAdjacentItems");

// ../Output/Target/Microsoft/VSCode/vs/base/common/types.js
function isString(str) {
  return typeof str === "string";
}
__name(isString, "isString");
function isStringArray(value) {
  return isArrayOf(value, isString);
}
__name(isStringArray, "isStringArray");
function isArrayOf(value, check) {
  return Array.isArray(value) && value.every(check);
}
__name(isArrayOf, "isArrayOf");
function isObject(obj) {
  return typeof obj === "object" && obj !== null && !Array.isArray(obj) && !(obj instanceof RegExp) && !(obj instanceof Date);
}
__name(isObject, "isObject");
function isTypedArray(obj) {
  const TypedArray = Object.getPrototypeOf(Uint8Array);
  return typeof obj === "object" && obj instanceof TypedArray;
}
__name(isTypedArray, "isTypedArray");
function isNumber(obj) {
  return typeof obj === "number" && !isNaN(obj);
}
__name(isNumber, "isNumber");
function isIterable(obj) {
  return !!obj && typeof obj[Symbol.iterator] === "function";
}
__name(isIterable, "isIterable");
function isAsyncIterable(obj) {
  return !!obj && typeof obj[Symbol.asyncIterator] === "function";
}
__name(isAsyncIterable, "isAsyncIterable");
function isBoolean(obj) {
  return obj === true || obj === false;
}
__name(isBoolean, "isBoolean");
function isUndefined(obj) {
  return typeof obj === "undefined";
}
__name(isUndefined, "isUndefined");
function isDefined(arg) {
  return !isUndefinedOrNull(arg);
}
__name(isDefined, "isDefined");
function isUndefinedOrNull(obj) {
  return isUndefined(obj) || obj === null;
}
__name(isUndefinedOrNull, "isUndefinedOrNull");
function assertType(condition, type) {
  if (!condition) {
    throw new Error(type ? `Unexpected type, expected '${type}'` : "Unexpected type");
  }
}
__name(assertType, "assertType");
function assertReturnsDefined(arg) {
  assert(arg !== null && arg !== void 0, "Argument is `undefined` or `null`.");
  return arg;
}
__name(assertReturnsDefined, "assertReturnsDefined");
function assertDefined(value, error) {
  if (value === null || value === void 0) {
    const errorToThrow = typeof error === "string" ? new Error(error) : error;
    throw errorToThrow;
  }
}
__name(assertDefined, "assertDefined");
function assertReturnsAllDefined(...args) {
  const result = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (isUndefinedOrNull(arg)) {
      throw new Error(`Assertion Failed: argument at index ${i} is undefined or null`);
    }
    result.push(arg);
  }
  return result;
}
__name(assertReturnsAllDefined, "assertReturnsAllDefined");
var isOneOf = /* @__PURE__ */ __name((value, validValues) => {
  return validValues.includes(value);
}, "isOneOf");
function typeCheck(_thing) {
}
__name(typeCheck, "typeCheck");
var hasOwnProperty = Object.prototype.hasOwnProperty;
function isEmptyObject(obj) {
  if (!isObject(obj)) {
    return false;
  }
  for (const key in obj) {
    if (hasOwnProperty.call(obj, key)) {
      return false;
    }
  }
  return true;
}
__name(isEmptyObject, "isEmptyObject");
function isFunction(obj) {
  return typeof obj === "function";
}
__name(isFunction, "isFunction");
function areFunctions(...objects) {
  return objects.length > 0 && objects.every(isFunction);
}
__name(areFunctions, "areFunctions");
function validateConstraints(args, constraints) {
  const len = Math.min(args.length, constraints.length);
  for (let i = 0; i < len; i++) {
    validateConstraint(args[i], constraints[i]);
  }
}
__name(validateConstraints, "validateConstraints");
function validateConstraint(arg, constraint) {
  if (isString(constraint)) {
    if (typeof arg !== constraint) {
      throw new Error(`argument does not match constraint: typeof ${constraint}`);
    }
  } else if (isFunction(constraint)) {
    try {
      if (arg instanceof constraint) {
        return;
      }
    } catch {
    }
    if (!isUndefinedOrNull(arg) && arg.constructor === constraint) {
      return;
    }
    if (constraint.length === 1 && constraint.call(void 0, arg) === true) {
      return;
    }
    throw new Error(`argument does not match one of these constraints: arg instanceof constraint, arg.constructor === constraint, nor constraint(arg) === true`);
  }
}
__name(validateConstraint, "validateConstraint");
function upcast(x) {
  return x;
}
__name(upcast, "upcast");
function hasKey(x, key) {
  for (const k in key) {
    if (!(k in x)) {
      return false;
    }
  }
  return true;
}
__name(hasKey, "hasKey");

// ../Output/Target/Microsoft/VSCode/vs/base/common/iterator.js
var Iterable;
(function(Iterable2) {
  function is(thing) {
    return !!thing && typeof thing === "object" && typeof thing[Symbol.iterator] === "function";
  }
  __name(is, "is");
  Iterable2.is = is;
  const _empty = Object.freeze([]);
  function empty() {
    return _empty;
  }
  __name(empty, "empty");
  Iterable2.empty = empty;
  function* single(element) {
    yield element;
  }
  __name(single, "single");
  Iterable2.single = single;
  function wrap(iterableOrElement) {
    if (is(iterableOrElement)) {
      return iterableOrElement;
    } else {
      return single(iterableOrElement);
    }
  }
  __name(wrap, "wrap");
  Iterable2.wrap = wrap;
  function from(iterable) {
    return iterable ?? _empty;
  }
  __name(from, "from");
  Iterable2.from = from;
  function* reverse(array) {
    for (let i = array.length - 1; i >= 0; i--) {
      yield array[i];
    }
  }
  __name(reverse, "reverse");
  Iterable2.reverse = reverse;
  function isEmpty(iterable) {
    return !iterable || iterable[Symbol.iterator]().next().done === true;
  }
  __name(isEmpty, "isEmpty");
  Iterable2.isEmpty = isEmpty;
  function first(iterable) {
    return iterable[Symbol.iterator]().next().value;
  }
  __name(first, "first");
  Iterable2.first = first;
  function some(iterable, predicate) {
    let i = 0;
    for (const element of iterable) {
      if (predicate(element, i++)) {
        return true;
      }
    }
    return false;
  }
  __name(some, "some");
  Iterable2.some = some;
  function every(iterable, predicate) {
    let i = 0;
    for (const element of iterable) {
      if (!predicate(element, i++)) {
        return false;
      }
    }
    return true;
  }
  __name(every, "every");
  Iterable2.every = every;
  function find(iterable, predicate) {
    for (const element of iterable) {
      if (predicate(element)) {
        return element;
      }
    }
    return void 0;
  }
  __name(find, "find");
  Iterable2.find = find;
  function* filter(iterable, predicate) {
    for (const element of iterable) {
      if (predicate(element)) {
        yield element;
      }
    }
  }
  __name(filter, "filter");
  Iterable2.filter = filter;
  function* map(iterable, fn) {
    let index2 = 0;
    for (const element of iterable) {
      yield fn(element, index2++);
    }
  }
  __name(map, "map");
  Iterable2.map = map;
  function* flatMap(iterable, fn) {
    let index2 = 0;
    for (const element of iterable) {
      yield* fn(element, index2++);
    }
  }
  __name(flatMap, "flatMap");
  Iterable2.flatMap = flatMap;
  function* concat(...iterables) {
    for (const item of iterables) {
      if (isIterable(item)) {
        yield* item;
      } else {
        yield item;
      }
    }
  }
  __name(concat, "concat");
  Iterable2.concat = concat;
  function reduce(iterable, reducer, initialValue) {
    let value = initialValue;
    for (const element of iterable) {
      value = reducer(value, element);
    }
    return value;
  }
  __name(reduce, "reduce");
  Iterable2.reduce = reduce;
  function length(iterable) {
    let count = 0;
    for (const _ of iterable) {
      count++;
    }
    return count;
  }
  __name(length, "length");
  Iterable2.length = length;
  function* slice(arr, from2, to = arr.length) {
    if (from2 < -arr.length) {
      from2 = 0;
    }
    if (from2 < 0) {
      from2 += arr.length;
    }
    if (to < 0) {
      to += arr.length;
    } else if (to > arr.length) {
      to = arr.length;
    }
    for (; from2 < to; from2++) {
      yield arr[from2];
    }
  }
  __name(slice, "slice");
  Iterable2.slice = slice;
  function consume(iterable, atMost = Number.POSITIVE_INFINITY) {
    const consumed = [];
    if (atMost === 0) {
      return [consumed, iterable];
    }
    const iterator = iterable[Symbol.iterator]();
    for (let i = 0; i < atMost; i++) {
      const next = iterator.next();
      if (next.done) {
        return [consumed, Iterable2.empty()];
      }
      consumed.push(next.value);
    }
    return [consumed, { [Symbol.iterator]() {
      return iterator;
    } }];
  }
  __name(consume, "consume");
  Iterable2.consume = consume;
  async function asyncToArray(iterable) {
    const result = [];
    for await (const item of iterable) {
      result.push(item);
    }
    return result;
  }
  __name(asyncToArray, "asyncToArray");
  Iterable2.asyncToArray = asyncToArray;
  async function asyncToArrayFlat(iterable) {
    let result = [];
    for await (const item of iterable) {
      result = result.concat(item);
    }
    return result;
  }
  __name(asyncToArrayFlat, "asyncToArrayFlat");
  Iterable2.asyncToArrayFlat = asyncToArrayFlat;
})(Iterable || (Iterable = {}));

// ../Output/Target/Microsoft/VSCode/vs/base/common/lifecycle.js
var TRACK_DISPOSABLES = false;
var disposableTracker = null;
var GCBasedDisposableTracker = class {
  static {
    __name(this, "GCBasedDisposableTracker");
  }
  constructor() {
    this._registry = new FinalizationRegistry((heldValue) => {
      console.warn(`[LEAKED DISPOSABLE] ${heldValue}`);
    });
  }
  trackDisposable(disposable) {
    const stack = new Error("CREATED via:").stack;
    this._registry.register(disposable, stack, disposable);
  }
  setParent(child, parent) {
    if (parent) {
      this._registry.unregister(child);
    } else {
      this.trackDisposable(child);
    }
  }
  markAsDisposed(disposable) {
    this._registry.unregister(disposable);
  }
  markAsSingleton(disposable) {
    this._registry.unregister(disposable);
  }
};
var DisposableTracker = class _DisposableTracker {
  static {
    __name(this, "DisposableTracker");
  }
  constructor() {
    this.livingDisposables = /* @__PURE__ */ new Map();
  }
  static {
    this.idx = 0;
  }
  getDisposableData(d) {
    let val = this.livingDisposables.get(d);
    if (!val) {
      val = { parent: null, source: null, isSingleton: false, value: d, idx: _DisposableTracker.idx++ };
      this.livingDisposables.set(d, val);
    }
    return val;
  }
  trackDisposable(d) {
    const data = this.getDisposableData(d);
    if (!data.source) {
      data.source = new Error().stack;
    }
  }
  setParent(child, parent) {
    const data = this.getDisposableData(child);
    data.parent = parent;
  }
  markAsDisposed(x) {
    this.livingDisposables.delete(x);
  }
  markAsSingleton(disposable) {
    this.getDisposableData(disposable).isSingleton = true;
  }
  getRootParent(data, cache) {
    const cacheValue = cache.get(data);
    if (cacheValue) {
      return cacheValue;
    }
    const result = data.parent ? this.getRootParent(this.getDisposableData(data.parent), cache) : data;
    cache.set(data, result);
    return result;
  }
  getTrackedDisposables() {
    const rootParentCache = /* @__PURE__ */ new Map();
    const leaking = [...this.livingDisposables.entries()].filter(([, v]) => v.source !== null && !this.getRootParent(v, rootParentCache).isSingleton).flatMap(([k]) => k);
    return leaking;
  }
  computeLeakingDisposables(maxReported = 10, preComputedLeaks) {
    let uncoveredLeakingObjs;
    if (preComputedLeaks) {
      uncoveredLeakingObjs = preComputedLeaks;
    } else {
      const rootParentCache = /* @__PURE__ */ new Map();
      const leakingObjects = [...this.livingDisposables.values()].filter((info) => info.source !== null && !this.getRootParent(info, rootParentCache).isSingleton);
      if (leakingObjects.length === 0) {
        return;
      }
      const leakingObjsSet = new Set(leakingObjects.map((o) => o.value));
      uncoveredLeakingObjs = leakingObjects.filter((l) => {
        return !(l.parent && leakingObjsSet.has(l.parent));
      });
      if (uncoveredLeakingObjs.length === 0) {
        throw new Error("There are cyclic diposable chains!");
      }
    }
    if (!uncoveredLeakingObjs) {
      return void 0;
    }
    function getStackTracePath(leaking) {
      function removePrefix(array, linesToRemove) {
        while (array.length > 0 && linesToRemove.some((regexp) => typeof regexp === "string" ? regexp === array[0] : array[0].match(regexp))) {
          array.shift();
        }
      }
      __name(removePrefix, "removePrefix");
      const lines = leaking.source.split("\n").map((p) => p.trim().replace("at ", "")).filter((l) => l !== "");
      removePrefix(lines, ["Error", /^trackDisposable \(.*\)$/, /^DisposableTracker.trackDisposable \(.*\)$/]);
      return lines.reverse();
    }
    __name(getStackTracePath, "getStackTracePath");
    const stackTraceStarts = new SetMap();
    for (const leaking of uncoveredLeakingObjs) {
      const stackTracePath = getStackTracePath(leaking);
      for (let i2 = 0; i2 <= stackTracePath.length; i2++) {
        stackTraceStarts.add(stackTracePath.slice(0, i2).join("\n"), leaking);
      }
    }
    uncoveredLeakingObjs.sort(compareBy((l) => l.idx, numberComparator));
    let message = "";
    let i = 0;
    for (const leaking of uncoveredLeakingObjs.slice(0, maxReported)) {
      i++;
      const stackTracePath = getStackTracePath(leaking);
      const stackTraceFormattedLines = [];
      for (let i2 = 0; i2 < stackTracePath.length; i2++) {
        let line = stackTracePath[i2];
        const starts = stackTraceStarts.get(stackTracePath.slice(0, i2 + 1).join("\n"));
        line = `(shared with ${starts.size}/${uncoveredLeakingObjs.length} leaks) at ${line}`;
        const prevStarts = stackTraceStarts.get(stackTracePath.slice(0, i2).join("\n"));
        const continuations = groupBy([...prevStarts].map((d) => getStackTracePath(d)[i2]), (v) => v);
        delete continuations[stackTracePath[i2]];
        for (const [cont, set] of Object.entries(continuations)) {
          if (set) {
            stackTraceFormattedLines.unshift(`    - stacktraces of ${set.length} other leaks continue with ${cont}`);
          }
        }
        stackTraceFormattedLines.unshift(line);
      }
      message += `


==================== Leaking disposable ${i}/${uncoveredLeakingObjs.length}: ${leaking.value.constructor.name} ====================
${stackTraceFormattedLines.join("\n")}
============================================================

`;
    }
    if (uncoveredLeakingObjs.length > maxReported) {
      message += `


... and ${uncoveredLeakingObjs.length - maxReported} more leaking disposables

`;
    }
    return { leaks: uncoveredLeakingObjs, details: message };
  }
};
function setDisposableTracker(tracker) {
  disposableTracker = tracker;
}
__name(setDisposableTracker, "setDisposableTracker");
if (TRACK_DISPOSABLES) {
  const __is_disposable_tracked__ = "__is_disposable_tracked__";
  setDisposableTracker(new class {
    trackDisposable(x) {
      const stack = new Error("Potentially leaked disposable").stack;
      setTimeout(() => {
        if (!x[__is_disposable_tracked__]) {
          console.log(stack);
        }
      }, 3e3);
    }
    setParent(child, parent) {
      if (child && child !== Disposable.None) {
        try {
          child[__is_disposable_tracked__] = true;
        } catch {
        }
      }
    }
    markAsDisposed(disposable) {
      if (disposable && disposable !== Disposable.None) {
        try {
          disposable[__is_disposable_tracked__] = true;
        } catch {
        }
      }
    }
    markAsSingleton(disposable) {
    }
  }());
}
function trackDisposable(x) {
  disposableTracker?.trackDisposable(x);
  return x;
}
__name(trackDisposable, "trackDisposable");
function markAsDisposed(disposable) {
  disposableTracker?.markAsDisposed(disposable);
}
__name(markAsDisposed, "markAsDisposed");
function setParentOfDisposable(child, parent) {
  disposableTracker?.setParent(child, parent);
}
__name(setParentOfDisposable, "setParentOfDisposable");
function setParentOfDisposables(children, parent) {
  if (!disposableTracker) {
    return;
  }
  for (const child of children) {
    disposableTracker.setParent(child, parent);
  }
}
__name(setParentOfDisposables, "setParentOfDisposables");
function markAsSingleton(singleton) {
  disposableTracker?.markAsSingleton(singleton);
  return singleton;
}
__name(markAsSingleton, "markAsSingleton");
function isDisposable(thing) {
  return typeof thing === "object" && thing !== null && typeof thing.dispose === "function" && thing.dispose.length === 0;
}
__name(isDisposable, "isDisposable");
function dispose(arg) {
  if (Iterable.is(arg)) {
    const errors = [];
    for (const d of arg) {
      if (d) {
        try {
          d.dispose();
        } catch (e) {
          errors.push(e);
        }
      }
    }
    if (errors.length === 1) {
      throw errors[0];
    } else if (errors.length > 1) {
      throw new AggregateError(errors, "Encountered errors while disposing of store");
    }
    return Array.isArray(arg) ? [] : arg;
  } else if (arg) {
    arg.dispose();
    return arg;
  }
}
__name(dispose, "dispose");
function disposeIfDisposable(disposables) {
  for (const d of disposables) {
    if (isDisposable(d)) {
      d.dispose();
    }
  }
  return [];
}
__name(disposeIfDisposable, "disposeIfDisposable");
function combinedDisposable(...disposables) {
  const parent = toDisposable(() => dispose(disposables));
  setParentOfDisposables(disposables, parent);
  return parent;
}
__name(combinedDisposable, "combinedDisposable");
var FunctionDisposable = class {
  static {
    __name(this, "FunctionDisposable");
  }
  constructor(fn) {
    this._isDisposed = false;
    this._fn = fn;
    trackDisposable(this);
  }
  dispose() {
    if (this._isDisposed) {
      return;
    }
    if (!this._fn) {
      throw new Error(`Unbound disposable context: Need to use an arrow function to preserve the value of this`);
    }
    this._isDisposed = true;
    markAsDisposed(this);
    this._fn();
  }
};
function toDisposable(fn) {
  return new FunctionDisposable(fn);
}
__name(toDisposable, "toDisposable");
var DisposableStore = class _DisposableStore {
  static {
    __name(this, "DisposableStore");
  }
  static {
    this.DISABLE_DISPOSED_WARNING = false;
  }
  constructor() {
    this._toDispose = /* @__PURE__ */ new Set();
    this._isDisposed = false;
    trackDisposable(this);
  }
  /**
   * Dispose of all registered disposables and mark this object as disposed.
   *
   * Any future disposables added to this object will be disposed of on `add`.
   */
  dispose() {
    if (this._isDisposed) {
      return;
    }
    markAsDisposed(this);
    this._isDisposed = true;
    this.clear();
  }
  /**
   * @return `true` if this object has been disposed of.
   */
  get isDisposed() {
    return this._isDisposed;
  }
  /**
   * Dispose of all registered disposables but do not mark this object as disposed.
   */
  clear() {
    if (this._toDispose.size === 0) {
      return;
    }
    try {
      dispose(this._toDispose);
    } finally {
      this._toDispose.clear();
    }
  }
  /**
   * Add a new {@link IDisposable disposable} to the collection.
   */
  add(o) {
    if (!o || o === Disposable.None) {
      return o;
    }
    if (o === this) {
      throw new Error("Cannot register a disposable on itself!");
    }
    setParentOfDisposable(o, this);
    if (this._isDisposed) {
      if (!_DisposableStore.DISABLE_DISPOSED_WARNING) {
        console.warn(new Error("Trying to add a disposable to a DisposableStore that has already been disposed of. The added object will be leaked!").stack);
      }
    } else {
      this._toDispose.add(o);
    }
    return o;
  }
  /**
   * Deletes a disposable from store and disposes of it. This will not throw or warn and proceed to dispose the
   * disposable even when the disposable is not part in the store.
   */
  delete(o) {
    if (!o) {
      return;
    }
    if (o === this) {
      throw new Error("Cannot dispose a disposable on itself!");
    }
    this._toDispose.delete(o);
    o.dispose();
  }
  /**
   * Deletes the value from the store, but does not dispose it.
   */
  deleteAndLeak(o) {
    if (!o) {
      return;
    }
    if (this._toDispose.delete(o)) {
      setParentOfDisposable(o, null);
    }
  }
  assertNotDisposed() {
    if (this._isDisposed) {
      onUnexpectedError(new BugIndicatingError("Object disposed"));
    }
  }
};
var Disposable = class {
  static {
    __name(this, "Disposable");
  }
  static {
    this.None = Object.freeze({ dispose() {
    } });
  }
  constructor() {
    this._store = new DisposableStore();
    trackDisposable(this);
    setParentOfDisposable(this._store, this);
  }
  dispose() {
    markAsDisposed(this);
    this._store.dispose();
  }
  /**
   * Adds `o` to the collection of disposables managed by this object.
   */
  _register(o) {
    if (o === this) {
      throw new Error("Cannot register a disposable on itself!");
    }
    return this._store.add(o);
  }
};
var MutableDisposable = class {
  static {
    __name(this, "MutableDisposable");
  }
  constructor() {
    this._isDisposed = false;
    trackDisposable(this);
  }
  /**
   * Get the currently held disposable value, or `undefined` if this MutableDisposable has been disposed
   */
  get value() {
    return this._isDisposed ? void 0 : this._value;
  }
  /**
   * Set a new disposable value.
   *
   * Behaviour:
   * - If the MutableDisposable has been disposed, the setter is a no-op.
   * - If the new value is strictly equal to the current value, the setter is a no-op.
   * - Otherwise the previous value (if any) is disposed and the new value is stored.
   *
   * Related helpers:
   * - clear() resets the value to `undefined` (and disposes the previous value).
   * - clearAndLeak() returns the old value without disposing it and removes its parent.
   */
  set value(value) {
    if (this._isDisposed || value === this._value) {
      return;
    }
    this._value?.dispose();
    if (value) {
      setParentOfDisposable(value, this);
    }
    this._value = value;
  }
  /**
   * Resets the stored value and disposed of the previously stored value.
   */
  clear() {
    this.value = void 0;
  }
  dispose() {
    this._isDisposed = true;
    markAsDisposed(this);
    this._value?.dispose();
    this._value = void 0;
  }
  /**
   * Clears the value, but does not dispose it.
   * The old value is returned.
  */
  clearAndLeak() {
    const oldValue = this._value;
    this._value = void 0;
    if (oldValue) {
      setParentOfDisposable(oldValue, null);
    }
    return oldValue;
  }
};
var MandatoryMutableDisposable = class {
  static {
    __name(this, "MandatoryMutableDisposable");
  }
  constructor(initialValue) {
    this._disposable = new MutableDisposable();
    this._isDisposed = false;
    this._disposable.value = initialValue;
  }
  get value() {
    return this._disposable.value;
  }
  set value(value) {
    if (this._isDisposed || value === this._disposable.value) {
      return;
    }
    this._disposable.value = value;
  }
  dispose() {
    this._isDisposed = true;
    this._disposable.dispose();
  }
};
var RefCountedDisposable = class {
  static {
    __name(this, "RefCountedDisposable");
  }
  constructor(_disposable) {
    this._disposable = _disposable;
    this._counter = 1;
  }
  acquire() {
    this._counter++;
    return this;
  }
  release() {
    if (--this._counter === 0) {
      this._disposable.dispose();
    }
    return this;
  }
};
var ReferenceCollection = class {
  static {
    __name(this, "ReferenceCollection");
  }
  constructor() {
    this.references = /* @__PURE__ */ new Map();
  }
  acquire(key, ...args) {
    let reference = this.references.get(key);
    if (!reference) {
      reference = { counter: 0, object: this.createReferencedObject(key, ...args) };
      this.references.set(key, reference);
    }
    const { object } = reference;
    const dispose2 = createSingleCallFunction(() => {
      if (--reference.counter === 0) {
        this.destroyReferencedObject(key, reference.object);
        this.references.delete(key);
      }
    });
    reference.counter++;
    return { object, dispose: dispose2 };
  }
};
var AsyncReferenceCollection = class {
  static {
    __name(this, "AsyncReferenceCollection");
  }
  constructor(referenceCollection) {
    this.referenceCollection = referenceCollection;
  }
  async acquire(key, ...args) {
    const ref = this.referenceCollection.acquire(key, ...args);
    try {
      const object = await ref.object;
      return {
        object,
        dispose: /* @__PURE__ */ __name(() => ref.dispose(), "dispose")
      };
    } catch (error) {
      ref.dispose();
      throw error;
    }
  }
};
var ImmortalReference = class {
  static {
    __name(this, "ImmortalReference");
  }
  constructor(object) {
    this.object = object;
  }
  dispose() {
  }
};
function disposeOnReturn(fn) {
  const store = new DisposableStore();
  try {
    fn(store);
  } finally {
    store.dispose();
  }
}
__name(disposeOnReturn, "disposeOnReturn");
var DisposableMap = class {
  static {
    __name(this, "DisposableMap");
  }
  constructor(store = /* @__PURE__ */ new Map()) {
    this._isDisposed = false;
    this._store = store;
    trackDisposable(this);
  }
  /**
   * Disposes of all stored values and mark this object as disposed.
   *
   * Trying to use this object after it has been disposed of is an error.
   */
  dispose() {
    markAsDisposed(this);
    this._isDisposed = true;
    this.clearAndDisposeAll();
  }
  /**
   * Disposes of all stored values and clear the map, but DO NOT mark this object as disposed.
   */
  clearAndDisposeAll() {
    if (!this._store.size) {
      return;
    }
    try {
      dispose(this._store.values());
    } finally {
      this._store.clear();
    }
  }
  has(key) {
    return this._store.has(key);
  }
  get size() {
    return this._store.size;
  }
  get(key) {
    return this._store.get(key);
  }
  set(key, value, skipDisposeOnOverwrite = false) {
    if (this._isDisposed) {
      console.warn(new Error("Trying to add a disposable to a DisposableMap that has already been disposed of. The added object will be leaked!").stack);
    }
    if (!skipDisposeOnOverwrite) {
      this._store.get(key)?.dispose();
    }
    this._store.set(key, value);
    setParentOfDisposable(value, this);
  }
  /**
   * Delete the value stored for `key` from this map and also dispose of it.
   */
  deleteAndDispose(key) {
    this._store.get(key)?.dispose();
    this._store.delete(key);
  }
  /**
   * Delete the value stored for `key` from this map but return it. The caller is
   * responsible for disposing of the value.
   */
  deleteAndLeak(key) {
    const value = this._store.get(key);
    if (value) {
      setParentOfDisposable(value, null);
    }
    this._store.delete(key);
    return value;
  }
  keys() {
    return this._store.keys();
  }
  values() {
    return this._store.values();
  }
  [Symbol.iterator]() {
    return this._store[Symbol.iterator]();
  }
};
var DisposableSet = class {
  static {
    __name(this, "DisposableSet");
  }
  constructor(store = /* @__PURE__ */ new Set()) {
    this._isDisposed = false;
    this._store = store;
    trackDisposable(this);
  }
  /**
   * Disposes of all stored values and mark this object as disposed.
   *
   * Trying to use this object after it has been disposed of is an error.
   */
  dispose() {
    markAsDisposed(this);
    this._isDisposed = true;
    this.clearAndDisposeAll();
  }
  /**
   * Disposes of all stored values and clear the set, but DO NOT mark this object as disposed.
   */
  clearAndDisposeAll() {
    if (!this._store.size) {
      return;
    }
    try {
      dispose(this._store.values());
    } finally {
      this._store.clear();
    }
  }
  has(value) {
    return this._store.has(value);
  }
  get size() {
    return this._store.size;
  }
  add(value) {
    if (this._isDisposed) {
      console.warn(new Error("Trying to add a disposable to a DisposableSet that has already been disposed of. The added object will be leaked!").stack);
    }
    this._store.add(value);
    setParentOfDisposable(value, this);
  }
  /**
   * Delete the value from this set and also dispose of it.
   */
  deleteAndDispose(value) {
    if (this._store.delete(value)) {
      value.dispose();
    }
  }
  /**
   * Delete the value from this set but return it. The caller is
   * responsible for disposing of the value.
   */
  deleteAndLeak(value) {
    if (this._store.delete(value)) {
      setParentOfDisposable(value, null);
      return value;
    }
    return void 0;
  }
  values() {
    return this._store.values();
  }
  [Symbol.iterator]() {
    return this._store[Symbol.iterator]();
  }
};
function thenIfNotDisposed(promise, then) {
  let disposed = false;
  promise.then((result) => {
    if (disposed) {
      return;
    }
    then(result);
  });
  return toDisposable(() => {
    disposed = true;
  });
}
__name(thenIfNotDisposed, "thenIfNotDisposed");
function thenRegisterOrDispose(promise, store) {
  return promise.then((disposable) => {
    if (store.isDisposed) {
      disposable.dispose();
    } else {
      store.add(disposable);
    }
    return disposable;
  });
}
__name(thenRegisterOrDispose, "thenRegisterOrDispose");
var DisposableResourceMap = class extends DisposableMap {
  static {
    __name(this, "DisposableResourceMap");
  }
  constructor() {
    super(new ResourceMap());
  }
};

// ../Output/Target/Microsoft/VSCode/vs/base/common/linkedList.js
var Node = class _Node {
  static {
    __name(this, "Node");
  }
  static {
    this.Undefined = new _Node(void 0);
  }
  constructor(element) {
    this.element = element;
    this.next = _Node.Undefined;
    this.prev = _Node.Undefined;
  }
};
var LinkedList = class {
  static {
    __name(this, "LinkedList");
  }
  constructor() {
    this._first = Node.Undefined;
    this._last = Node.Undefined;
    this._size = 0;
  }
  get size() {
    return this._size;
  }
  isEmpty() {
    return this._first === Node.Undefined;
  }
  clear() {
    let node = this._first;
    while (node !== Node.Undefined) {
      const next = node.next;
      node.prev = Node.Undefined;
      node.next = Node.Undefined;
      node = next;
    }
    this._first = Node.Undefined;
    this._last = Node.Undefined;
    this._size = 0;
  }
  unshift(element) {
    return this._insert(element, false);
  }
  push(element) {
    return this._insert(element, true);
  }
  _insert(element, atTheEnd) {
    const newNode = new Node(element);
    if (this._first === Node.Undefined) {
      this._first = newNode;
      this._last = newNode;
    } else if (atTheEnd) {
      const oldLast = this._last;
      this._last = newNode;
      newNode.prev = oldLast;
      oldLast.next = newNode;
    } else {
      const oldFirst = this._first;
      this._first = newNode;
      newNode.next = oldFirst;
      oldFirst.prev = newNode;
    }
    this._size += 1;
    let didRemove = false;
    return () => {
      if (!didRemove) {
        didRemove = true;
        this._remove(newNode);
      }
    };
  }
  shift() {
    if (this._first === Node.Undefined) {
      return void 0;
    } else {
      const res = this._first.element;
      this._remove(this._first);
      return res;
    }
  }
  pop() {
    if (this._last === Node.Undefined) {
      return void 0;
    } else {
      const res = this._last.element;
      this._remove(this._last);
      return res;
    }
  }
  peek() {
    if (this._last === Node.Undefined) {
      return void 0;
    } else {
      const res = this._last.element;
      return res;
    }
  }
  _remove(node) {
    if (node.prev !== Node.Undefined && node.next !== Node.Undefined) {
      const anchor = node.prev;
      anchor.next = node.next;
      node.next.prev = anchor;
    } else if (node.prev === Node.Undefined && node.next === Node.Undefined) {
      this._first = Node.Undefined;
      this._last = Node.Undefined;
    } else if (node.next === Node.Undefined) {
      this._last = this._last.prev;
      this._last.next = Node.Undefined;
    } else if (node.prev === Node.Undefined) {
      this._first = this._first.next;
      this._first.prev = Node.Undefined;
    }
    this._size -= 1;
  }
  *[Symbol.iterator]() {
    let node = this._first;
    while (node !== Node.Undefined) {
      yield node.element;
      node = node.next;
    }
  }
};

// ../Output/Target/Microsoft/VSCode/vs/nls.js
function getNLSMessages() {
  return globalThis._VSCODE_NLS_MESSAGES;
}
__name(getNLSMessages, "getNLSMessages");
function getNLSLanguage() {
  return globalThis._VSCODE_NLS_LANGUAGE;
}
__name(getNLSLanguage, "getNLSLanguage");
var isPseudo = getNLSLanguage() === "pseudo" || typeof document !== "undefined" && document.location && typeof document.location.hash === "string" && document.location.hash.indexOf("pseudo=true") >= 0;
function _format(message, args) {
  let result;
  if (args.length === 0) {
    result = message;
  } else {
    result = message.replace(/\{(\d+)\}/g, (match, rest) => {
      const index2 = rest[0];
      const arg = args[index2];
      let result2 = match;
      if (typeof arg === "string") {
        result2 = arg;
      } else if (typeof arg === "number" || typeof arg === "boolean" || arg === void 0 || arg === null) {
        result2 = String(arg);
      }
      return result2;
    });
  }
  if (isPseudo) {
    result = "\uFF3B" + result.replace(/[aouei]/g, "$&$&") + "\uFF3D";
  }
  return result;
}
__name(_format, "_format");
function localize(data, message, ...args) {
  if (typeof data === "number") {
    return _format(lookupMessage(data, message), args);
  }
  return _format(message, args);
}
__name(localize, "localize");
function lookupMessage(index2, fallback) {
  const message = getNLSMessages()?.[index2];
  if (typeof message !== "string") {
    if (typeof fallback === "string") {
      return fallback;
    }
    throw new Error(`!!! NLS MISSING: ${index2} !!!`);
  }
  return message;
}
__name(lookupMessage, "lookupMessage");
function localize2(data, originalMessage, ...args) {
  let message;
  if (typeof data === "number") {
    message = lookupMessage(data, originalMessage);
  } else {
    message = originalMessage;
  }
  const value = _format(message, args);
  return {
    value,
    original: originalMessage === message ? value : _format(originalMessage, args)
  };
}
__name(localize2, "localize2");

// ../Output/Target/Microsoft/VSCode/vs/base/common/platform.js
var LANGUAGE_DEFAULT = "en";
var _isWindows = false;
var _isMacintosh = false;
var _isLinux = false;
var _isLinuxSnap = false;
var _isNative = false;
var _isWeb = false;
var _isElectron = false;
var _isIOS = false;
var _isCI = false;
var _isMobile = false;
var _locale = void 0;
var _language = LANGUAGE_DEFAULT;
var _platformLocale = LANGUAGE_DEFAULT;
var _translationsConfigFile = void 0;
var _userAgent = void 0;
var $globalThis = globalThis;
var nodeProcess = void 0;
if (typeof $globalThis.vscode !== "undefined" && typeof $globalThis.vscode.process !== "undefined") {
  nodeProcess = $globalThis.vscode.process;
} else if (typeof process !== "undefined" && typeof process?.versions?.node === "string") {
  nodeProcess = process;
}
var isElectronProcess = typeof nodeProcess?.versions?.electron === "string";
var isElectronRenderer = isElectronProcess && nodeProcess?.type === "renderer";
if (typeof nodeProcess === "object") {
  _isWindows = nodeProcess.platform === "win32";
  _isMacintosh = nodeProcess.platform === "darwin";
  _isLinux = nodeProcess.platform === "linux";
  _isLinuxSnap = _isLinux && !!nodeProcess.env["SNAP"] && !!nodeProcess.env["SNAP_REVISION"];
  _isElectron = isElectronProcess;
  _isCI = !!nodeProcess.env["CI"] || !!nodeProcess.env["BUILD_ARTIFACTSTAGINGDIRECTORY"] || !!nodeProcess.env["GITHUB_WORKSPACE"];
  _locale = LANGUAGE_DEFAULT;
  _language = LANGUAGE_DEFAULT;
  const rawNlsConfig = nodeProcess.env["VSCODE_NLS_CONFIG"];
  if (rawNlsConfig) {
    try {
      const nlsConfig = JSON.parse(rawNlsConfig);
      _locale = nlsConfig.userLocale;
      _platformLocale = nlsConfig.osLocale;
      _language = nlsConfig.resolvedLanguage || LANGUAGE_DEFAULT;
      _translationsConfigFile = nlsConfig.languagePack?.translationsConfigFile;
    } catch (e) {
    }
  }
  _isNative = true;
} else if (typeof navigator === "object" && !isElectronRenderer) {
  _userAgent = navigator.userAgent;
  _isWindows = _userAgent.indexOf("Windows") >= 0;
  _isMacintosh = _userAgent.indexOf("Macintosh") >= 0;
  _isIOS = (_userAgent.indexOf("Macintosh") >= 0 || _userAgent.indexOf("iPad") >= 0 || _userAgent.indexOf("iPhone") >= 0) && !!navigator.maxTouchPoints && navigator.maxTouchPoints > 0;
  _isLinux = _userAgent.indexOf("Linux") >= 0;
  _isMobile = _userAgent?.indexOf("Mobi") >= 0;
  _isWeb = true;
  _language = getNLSLanguage() || LANGUAGE_DEFAULT;
  _locale = navigator.language.toLowerCase();
  _platformLocale = _locale;
} else {
  console.error("Unable to resolve platform.");
}
var Platform;
(function(Platform2) {
  Platform2[Platform2["Web"] = 0] = "Web";
  Platform2[Platform2["Mac"] = 1] = "Mac";
  Platform2[Platform2["Linux"] = 2] = "Linux";
  Platform2[Platform2["Windows"] = 3] = "Windows";
})(Platform || (Platform = {}));
function PlatformToString(platform3) {
  switch (platform3) {
    case 0:
      return "Web";
    case 1:
      return "Mac";
    case 2:
      return "Linux";
    case 3:
      return "Windows";
  }
}
__name(PlatformToString, "PlatformToString");
var _platform = 0;
if (_isMacintosh) {
  _platform = 1;
} else if (_isWindows) {
  _platform = 3;
} else if (_isLinux) {
  _platform = 2;
}
var isWindows = _isWindows;
var isMacintosh = _isMacintosh;
var isLinux = _isLinux;
var isLinuxSnap = _isLinuxSnap;
var isNative = _isNative;
var isElectron = _isElectron;
var isWeb = _isWeb;
var isWebWorker = _isWeb && typeof $globalThis.importScripts === "function";
var webWorkerOrigin = isWebWorker ? $globalThis.origin : void 0;
var isIOS = _isIOS;
var isMobile = _isMobile;
var isCI = _isCI;
var platform = _platform;
var userAgent = _userAgent;
var language = _language;
var Language;
(function(Language2) {
  function value() {
    return language;
  }
  __name(value, "value");
  Language2.value = value;
  function isDefaultVariant() {
    if (language.length === 2) {
      return language === "en";
    } else if (language.length >= 3) {
      return language[0] === "e" && language[1] === "n" && language[2] === "-";
    } else {
      return false;
    }
  }
  __name(isDefaultVariant, "isDefaultVariant");
  Language2.isDefaultVariant = isDefaultVariant;
  function isDefault() {
    return language === "en";
  }
  __name(isDefault, "isDefault");
  Language2.isDefault = isDefault;
})(Language || (Language = {}));
var locale = _locale;
var platformLocale = _platformLocale;
var translationsConfigFile = _translationsConfigFile;
var setTimeout0IsFaster = typeof $globalThis.postMessage === "function" && !$globalThis.importScripts;
var setTimeout0 = (() => {
  if (setTimeout0IsFaster) {
    const pending = [];
    $globalThis.addEventListener("message", (e) => {
      if (e.data && e.data.vscodeScheduleAsyncWork) {
        for (let i = 0, len = pending.length; i < len; i++) {
          const candidate = pending[i];
          if (candidate.id === e.data.vscodeScheduleAsyncWork) {
            pending.splice(i, 1);
            candidate.callback();
            return;
          }
        }
      }
    });
    let lastId = 0;
    return (callback) => {
      const myId = ++lastId;
      pending.push({
        id: myId,
        callback
      });
      $globalThis.postMessage({ vscodeScheduleAsyncWork: myId }, "*");
    };
  }
  return (callback) => setTimeout(callback);
})();
var OperatingSystem;
(function(OperatingSystem2) {
  OperatingSystem2[OperatingSystem2["Windows"] = 1] = "Windows";
  OperatingSystem2[OperatingSystem2["Macintosh"] = 2] = "Macintosh";
  OperatingSystem2[OperatingSystem2["Linux"] = 3] = "Linux";
})(OperatingSystem || (OperatingSystem = {}));
var OS = _isMacintosh || _isIOS ? 2 : _isWindows ? 1 : 3;
var _isLittleEndian = true;
var _isLittleEndianComputed = false;
function isLittleEndian() {
  if (!_isLittleEndianComputed) {
    _isLittleEndianComputed = true;
    const test = new Uint8Array(2);
    test[0] = 1;
    test[1] = 2;
    const view = new Uint16Array(test.buffer);
    _isLittleEndian = view[0] === (2 << 8) + 1;
  }
  return _isLittleEndian;
}
__name(isLittleEndian, "isLittleEndian");
var isChrome = !!(userAgent && userAgent.indexOf("Chrome") >= 0);
var isFirefox = !!(userAgent && userAgent.indexOf("Firefox") >= 0);
var isSafari = !!(!isChrome && (userAgent && userAgent.indexOf("Safari") >= 0));
var isEdge = !!(userAgent && userAgent.indexOf("Edg/") >= 0);
var isAndroid = !!(userAgent && userAgent.indexOf("Android") >= 0);
function isTahoeOrNewer(osVersion) {
  return parseFloat(osVersion) >= 25;
}
__name(isTahoeOrNewer, "isTahoeOrNewer");

// ../Output/Target/Microsoft/VSCode/vs/base/common/process.js
var safeProcess;
var vscodeGlobal = globalThis.vscode;
if (typeof vscodeGlobal !== "undefined" && typeof vscodeGlobal.process !== "undefined") {
  const sandboxProcess = vscodeGlobal.process;
  safeProcess = {
    get platform() {
      return sandboxProcess.platform;
    },
    get arch() {
      return sandboxProcess.arch;
    },
    get env() {
      return sandboxProcess.env;
    },
    cwd() {
      return sandboxProcess.cwd();
    }
  };
} else if (typeof process !== "undefined" && typeof process?.versions?.node === "string") {
  safeProcess = {
    get platform() {
      return process.platform;
    },
    get arch() {
      return process.arch;
    },
    get env() {
      return process.env;
    },
    cwd() {
      return process.env["VSCODE_CWD"] || process.cwd();
    }
  };
} else {
  safeProcess = {
    // Supported
    get platform() {
      return isWindows ? "win32" : isMacintosh ? "darwin" : "linux";
    },
    get arch() {
      return void 0;
    },
    // Unsupported
    get env() {
      return {};
    },
    cwd() {
      return "/";
    }
  };
}
var cwd = safeProcess.cwd;
var env = safeProcess.env;
var platform2 = safeProcess.platform;
var arch = safeProcess.arch;

// ../Output/Target/Microsoft/VSCode/vs/base/common/stopwatch.js
var performanceNow = globalThis.performance.now.bind(globalThis.performance);
var StopWatch = class _StopWatch {
  static {
    __name(this, "StopWatch");
  }
  static create(highResolution) {
    return new _StopWatch(highResolution);
  }
  constructor(highResolution) {
    this._now = highResolution === false ? Date.now : performanceNow;
    this._startTime = this._now();
    this._stopTime = -1;
  }
  stop() {
    this._stopTime = this._now();
  }
  reset() {
    this._startTime = this._now();
    this._stopTime = -1;
  }
  elapsed() {
    if (this._stopTime !== -1) {
      return this._stopTime - this._startTime;
    }
    return this._now() - this._startTime;
  }
};

// ../Output/Target/Microsoft/VSCode/vs/base/common/event.js
var _enableDisposeWithListenerWarning = false;
var _enableSnapshotPotentialLeakWarning = false;
var _bufferLeakWarnCountThreshold = 100;
var _bufferLeakWarnTimeThreshold = 6e4;
function _isBufferLeakWarningEnabled() {
  return !!env["VSCODE_DEV"];
}
__name(_isBufferLeakWarningEnabled, "_isBufferLeakWarningEnabled");
var Event;
(function(Event2) {
  Event2.None = () => Disposable.None;
  function _addLeakageTraceLogic(options) {
    if (_enableSnapshotPotentialLeakWarning) {
      const { onDidAddListener: origListenerDidAdd } = options;
      const stack = Stacktrace.create();
      let count = 0;
      options.onDidAddListener = () => {
        if (++count === 2) {
          console.warn("snapshotted emitter LIKELY used public and SHOULD HAVE BEEN created with DisposableStore. snapshotted here");
          stack.print();
        }
        origListenerDidAdd?.();
      };
    }
  }
  __name(_addLeakageTraceLogic, "_addLeakageTraceLogic");
  function defer(event, flushOnListenerRemove, disposable) {
    return debounce(event, () => void 0, 0, void 0, flushOnListenerRemove ?? true, void 0, disposable);
  }
  __name(defer, "defer");
  Event2.defer = defer;
  function once(event) {
    return (listener, thisArgs = null, disposables) => {
      let didFire = false;
      let result = void 0;
      result = event((e) => {
        if (didFire) {
          return;
        } else if (result) {
          result.dispose();
        } else {
          didFire = true;
        }
        return listener.call(thisArgs, e);
      }, null, disposables);
      if (didFire) {
        result.dispose();
      }
      return result;
    };
  }
  __name(once, "once");
  Event2.once = once;
  function onceIf(event, condition) {
    return Event2.once(Event2.filter(event, condition));
  }
  __name(onceIf, "onceIf");
  Event2.onceIf = onceIf;
  function map(event, map2, disposable) {
    return snapshot((listener, thisArgs = null, disposables) => event((i) => listener.call(thisArgs, map2(i)), null, disposables), disposable);
  }
  __name(map, "map");
  Event2.map = map;
  function forEach(event, each, disposable) {
    return snapshot((listener, thisArgs = null, disposables) => event((i) => {
      each(i);
      listener.call(thisArgs, i);
    }, null, disposables), disposable);
  }
  __name(forEach, "forEach");
  Event2.forEach = forEach;
  function filter(event, filter2, disposable) {
    return snapshot((listener, thisArgs = null, disposables) => event((e) => filter2(e) && listener.call(thisArgs, e), null, disposables), disposable);
  }
  __name(filter, "filter");
  Event2.filter = filter;
  function signal(event) {
    return event;
  }
  __name(signal, "signal");
  Event2.signal = signal;
  function any(...events) {
    return (listener, thisArgs = null, disposables) => {
      const disposable = combinedDisposable(...events.map((event) => event((e) => listener.call(thisArgs, e))));
      return addAndReturnDisposable(disposable, disposables);
    };
  }
  __name(any, "any");
  Event2.any = any;
  function reduce(event, merge, initial, disposable) {
    let output = initial;
    return map(event, (e) => {
      output = merge(output, e);
      return output;
    }, disposable);
  }
  __name(reduce, "reduce");
  Event2.reduce = reduce;
  function snapshot(event, disposable) {
    let listener;
    const options = {
      onWillAddFirstListener() {
        listener = event(emitter.fire, emitter);
      },
      onDidRemoveLastListener() {
        listener?.dispose();
      }
    };
    if (!disposable) {
      _addLeakageTraceLogic(options);
    }
    const emitter = new Emitter(options);
    disposable?.add(emitter);
    return emitter.event;
  }
  __name(snapshot, "snapshot");
  function addAndReturnDisposable(d, store) {
    if (store instanceof Array) {
      store.push(d);
    } else if (store) {
      store.add(d);
    }
    return d;
  }
  __name(addAndReturnDisposable, "addAndReturnDisposable");
  function debounce(event, merge, delay = 100, leading = false, flushOnListenerRemove = false, leakWarningThreshold, disposable) {
    let subscription;
    let output = void 0;
    let handle = void 0;
    let numDebouncedCalls = 0;
    let doFire;
    const options = {
      leakWarningThreshold,
      onWillAddFirstListener() {
        subscription = event((cur) => {
          numDebouncedCalls++;
          output = merge(output, cur);
          if (leading && !handle) {
            emitter.fire(output);
            output = void 0;
          }
          doFire = /* @__PURE__ */ __name(() => {
            const _output = output;
            output = void 0;
            handle = void 0;
            if (!leading || numDebouncedCalls > 1) {
              emitter.fire(_output);
            }
            numDebouncedCalls = 0;
          }, "doFire");
          if (typeof delay === "number") {
            if (handle) {
              clearTimeout(handle);
            }
            handle = setTimeout(doFire, delay);
          } else {
            if (handle === void 0) {
              handle = null;
              queueMicrotask(doFire);
            }
          }
        });
      },
      onWillRemoveListener() {
        if (flushOnListenerRemove && numDebouncedCalls > 0) {
          doFire?.();
        }
      },
      onDidRemoveLastListener() {
        doFire = void 0;
        subscription.dispose();
      }
    };
    if (!disposable) {
      _addLeakageTraceLogic(options);
    }
    const emitter = new Emitter(options);
    disposable?.add(emitter);
    return emitter.event;
  }
  __name(debounce, "debounce");
  Event2.debounce = debounce;
  function accumulate(event, delay = 0, flushOnListenerRemove, disposable) {
    return Event2.debounce(event, (last, e) => {
      if (!last) {
        return [e];
      }
      last.push(e);
      return last;
    }, delay, void 0, flushOnListenerRemove ?? true, void 0, disposable);
  }
  __name(accumulate, "accumulate");
  Event2.accumulate = accumulate;
  function throttle(event, merge, delay = 100, leading = true, trailing = true, leakWarningThreshold, disposable) {
    let subscription;
    let output = void 0;
    let handle = void 0;
    let numThrottledCalls = 0;
    const options = {
      leakWarningThreshold,
      onWillAddFirstListener() {
        subscription = event((cur) => {
          numThrottledCalls++;
          output = merge(output, cur);
          if (handle === void 0) {
            if (leading) {
              emitter.fire(output);
              output = void 0;
              numThrottledCalls = 0;
            }
            if (typeof delay === "number") {
              handle = setTimeout(() => {
                if (trailing && numThrottledCalls > 0) {
                  emitter.fire(output);
                }
                output = void 0;
                handle = void 0;
                numThrottledCalls = 0;
              }, delay);
            } else {
              handle = 0;
              queueMicrotask(() => {
                if (trailing && numThrottledCalls > 0) {
                  emitter.fire(output);
                }
                output = void 0;
                handle = void 0;
                numThrottledCalls = 0;
              });
            }
          }
        });
      },
      onDidRemoveLastListener() {
        subscription.dispose();
      }
    };
    if (!disposable) {
      _addLeakageTraceLogic(options);
    }
    const emitter = new Emitter(options);
    disposable?.add(emitter);
    return emitter.event;
  }
  __name(throttle, "throttle");
  Event2.throttle = throttle;
  function latch(event, equals2 = (a, b) => a === b, disposable) {
    let firstCall = true;
    let cache;
    return filter(event, (value) => {
      const shouldEmit = firstCall || !equals2(value, cache);
      firstCall = false;
      cache = value;
      return shouldEmit;
    }, disposable);
  }
  __name(latch, "latch");
  Event2.latch = latch;
  function split(event, isT, disposable) {
    return [
      Event2.filter(event, isT, disposable),
      Event2.filter(event, (e) => !isT(e), disposable)
    ];
  }
  __name(split, "split");
  Event2.split = split;
  function buffer(event, debugName, flushAfterTimeout = false, _buffer = [], disposable) {
    let buffer2 = _buffer.slice();
    let bufferLeakWarningData;
    if (_isBufferLeakWarningEnabled()) {
      bufferLeakWarningData = {
        stack: Stacktrace.create(),
        timerId: setTimeout(() => {
          if (buffer2 && buffer2.length > 0 && bufferLeakWarningData && !bufferLeakWarningData.warned) {
            bufferLeakWarningData.warned = true;
            console.warn(`[Event.buffer][${debugName}] potential LEAK detected: ${buffer2.length} events buffered for ${_bufferLeakWarnTimeThreshold / 1e3}s without being consumed. Buffered here:`);
            bufferLeakWarningData.stack.print();
          }
        }, _bufferLeakWarnTimeThreshold),
        warned: false
      };
      if (disposable) {
        disposable.add(toDisposable(() => clearTimeout(bufferLeakWarningData.timerId)));
      }
    }
    const clearLeakWarningTimer = /* @__PURE__ */ __name(() => {
      if (bufferLeakWarningData) {
        clearTimeout(bufferLeakWarningData.timerId);
      }
    }, "clearLeakWarningTimer");
    let listener = event((e) => {
      if (buffer2) {
        buffer2.push(e);
        if (_isBufferLeakWarningEnabled() && bufferLeakWarningData && !bufferLeakWarningData.warned && buffer2.length >= _bufferLeakWarnCountThreshold) {
          bufferLeakWarningData.warned = true;
          console.warn(`[Event.buffer][${debugName}] potential LEAK detected: ${buffer2.length} events buffered without being consumed. Buffered here:`);
          bufferLeakWarningData.stack.print();
        }
      } else {
        emitter.fire(e);
      }
    });
    if (disposable) {
      disposable.add(listener);
    }
    const flush = /* @__PURE__ */ __name(() => {
      buffer2?.forEach((e) => emitter.fire(e));
      buffer2 = null;
      clearLeakWarningTimer();
    }, "flush");
    const emitter = new Emitter({
      onWillAddFirstListener() {
        if (!listener) {
          listener = event((e) => emitter.fire(e));
          if (disposable) {
            disposable.add(listener);
          }
        }
      },
      onDidAddFirstListener() {
        if (buffer2) {
          if (flushAfterTimeout) {
            setTimeout(flush);
          } else {
            flush();
          }
        }
      },
      onDidRemoveLastListener() {
        if (listener) {
          listener.dispose();
        }
        listener = null;
        clearLeakWarningTimer();
      }
    });
    if (disposable) {
      disposable.add(emitter);
    }
    return emitter.event;
  }
  __name(buffer, "buffer");
  Event2.buffer = buffer;
  function chain(event, sythensize) {
    const fn = /* @__PURE__ */ __name((listener, thisArgs, disposables) => {
      const cs = sythensize(new ChainableSynthesis());
      return event(function(value) {
        const result = cs.evaluate(value);
        if (result !== HaltChainable) {
          listener.call(thisArgs, result);
        }
      }, void 0, disposables);
    }, "fn");
    return fn;
  }
  __name(chain, "chain");
  Event2.chain = chain;
  const HaltChainable = /* @__PURE__ */ Symbol("HaltChainable");
  class ChainableSynthesis {
    static {
      __name(this, "ChainableSynthesis");
    }
    constructor() {
      this.steps = [];
    }
    map(fn) {
      this.steps.push(fn);
      return this;
    }
    forEach(fn) {
      this.steps.push((v) => {
        fn(v);
        return v;
      });
      return this;
    }
    filter(fn) {
      this.steps.push((v) => fn(v) ? v : HaltChainable);
      return this;
    }
    reduce(merge, initial) {
      let last = initial;
      this.steps.push((v) => {
        last = merge(last, v);
        return last;
      });
      return this;
    }
    latch(equals2 = (a, b) => a === b) {
      let firstCall = true;
      let cache;
      this.steps.push((value) => {
        const shouldEmit = firstCall || !equals2(value, cache);
        firstCall = false;
        cache = value;
        return shouldEmit ? value : HaltChainable;
      });
      return this;
    }
    evaluate(value) {
      for (const step of this.steps) {
        value = step(value);
        if (value === HaltChainable) {
          break;
        }
      }
      return value;
    }
  }
  function fromNodeEventEmitter(emitter, eventName, map2 = (id2) => id2) {
    const fn = /* @__PURE__ */ __name((...args) => result.fire(map2(...args)), "fn");
    const onFirstListenerAdd = /* @__PURE__ */ __name(() => emitter.on(eventName, fn), "onFirstListenerAdd");
    const onLastListenerRemove = /* @__PURE__ */ __name(() => emitter.removeListener(eventName, fn), "onLastListenerRemove");
    const result = new Emitter({ onWillAddFirstListener: onFirstListenerAdd, onDidRemoveLastListener: onLastListenerRemove });
    return result.event;
  }
  __name(fromNodeEventEmitter, "fromNodeEventEmitter");
  Event2.fromNodeEventEmitter = fromNodeEventEmitter;
  function fromDOMEventEmitter(emitter, eventName, map2 = (id2) => id2) {
    const fn = /* @__PURE__ */ __name((...args) => result.fire(map2(...args)), "fn");
    const onFirstListenerAdd = /* @__PURE__ */ __name(() => emitter.addEventListener(eventName, fn), "onFirstListenerAdd");
    const onLastListenerRemove = /* @__PURE__ */ __name(() => emitter.removeEventListener(eventName, fn), "onLastListenerRemove");
    const result = new Emitter({ onWillAddFirstListener: onFirstListenerAdd, onDidRemoveLastListener: onLastListenerRemove });
    return result.event;
  }
  __name(fromDOMEventEmitter, "fromDOMEventEmitter");
  Event2.fromDOMEventEmitter = fromDOMEventEmitter;
  function toPromise(event, disposables) {
    let cancelRef;
    let listener;
    const promise = new Promise((resolve) => {
      listener = once(event)(resolve);
      addToDisposables(listener, disposables);
      cancelRef = /* @__PURE__ */ __name(() => {
        disposeAndRemove(listener, disposables);
      }, "cancelRef");
    });
    promise.cancel = cancelRef;
    if (disposables) {
      promise.finally(() => disposeAndRemove(listener, disposables));
    }
    return promise;
  }
  __name(toPromise, "toPromise");
  Event2.toPromise = toPromise;
  function forward(from, to) {
    return from((e) => to.fire(e));
  }
  __name(forward, "forward");
  Event2.forward = forward;
  function runAndSubscribe(event, handler, initial) {
    handler(initial);
    return event((e) => handler(e));
  }
  __name(runAndSubscribe, "runAndSubscribe");
  Event2.runAndSubscribe = runAndSubscribe;
  class EmitterObserver {
    static {
      __name(this, "EmitterObserver");
    }
    constructor(_observable, store) {
      this._observable = _observable;
      this._counter = 0;
      this._hasChanged = false;
      const options = {
        onWillAddFirstListener: /* @__PURE__ */ __name(() => {
          _observable.addObserver(this);
          this._observable.reportChanges();
        }, "onWillAddFirstListener"),
        onDidRemoveLastListener: /* @__PURE__ */ __name(() => {
          _observable.removeObserver(this);
        }, "onDidRemoveLastListener")
      };
      if (!store) {
        _addLeakageTraceLogic(options);
      }
      this.emitter = new Emitter(options);
      if (store) {
        store.add(this.emitter);
      }
    }
    beginUpdate(_observable) {
      this._counter++;
    }
    handlePossibleChange(_observable) {
    }
    handleChange(_observable, _change) {
      this._hasChanged = true;
    }
    endUpdate(_observable) {
      this._counter--;
      if (this._counter === 0) {
        this._observable.reportChanges();
        if (this._hasChanged) {
          this._hasChanged = false;
          this.emitter.fire(this._observable.get());
        }
      }
    }
  }
  function fromObservable(obs, store) {
    const observer = new EmitterObserver(obs, store);
    return observer.emitter.event;
  }
  __name(fromObservable, "fromObservable");
  Event2.fromObservable = fromObservable;
  function fromObservableLight(observable) {
    return (listener, thisArgs, disposables) => {
      let count = 0;
      let didChange = false;
      const observer = {
        beginUpdate() {
          count++;
        },
        endUpdate() {
          count--;
          if (count === 0) {
            observable.reportChanges();
            if (didChange) {
              didChange = false;
              listener.call(thisArgs);
            }
          }
        },
        handlePossibleChange() {
        },
        handleChange() {
          didChange = true;
        }
      };
      observable.addObserver(observer);
      observable.reportChanges();
      const disposable = {
        dispose() {
          observable.removeObserver(observer);
        }
      };
      addToDisposables(disposable, disposables);
      return disposable;
    };
  }
  __name(fromObservableLight, "fromObservableLight");
  Event2.fromObservableLight = fromObservableLight;
})(Event || (Event = {}));
var EventProfiling = class _EventProfiling {
  static {
    __name(this, "EventProfiling");
  }
  static {
    this.all = /* @__PURE__ */ new Set();
  }
  static {
    this._idPool = 0;
  }
  constructor(name) {
    this.listenerCount = 0;
    this.invocationCount = 0;
    this.elapsedOverall = 0;
    this.durations = [];
    this.name = `${name}_${_EventProfiling._idPool++}`;
    _EventProfiling.all.add(this);
  }
  start(listenerCount) {
    this._stopWatch = new StopWatch();
    this.listenerCount = listenerCount;
  }
  stop() {
    if (this._stopWatch) {
      const elapsed = this._stopWatch.elapsed();
      this.durations.push(elapsed);
      this.elapsedOverall += elapsed;
      this.invocationCount += 1;
      this._stopWatch = void 0;
    }
  }
};
var _globalLeakWarningThreshold = -1;
function setGlobalLeakWarningThreshold(n) {
  const oldValue = _globalLeakWarningThreshold;
  _globalLeakWarningThreshold = n;
  return {
    dispose() {
      _globalLeakWarningThreshold = oldValue;
    }
  };
}
__name(setGlobalLeakWarningThreshold, "setGlobalLeakWarningThreshold");
var LeakageMonitor = class _LeakageMonitor {
  static {
    __name(this, "LeakageMonitor");
  }
  static {
    this._idPool = 1;
  }
  constructor(_errorHandler, threshold, name = (_LeakageMonitor._idPool++).toString(16).padStart(3, "0")) {
    this._errorHandler = _errorHandler;
    this.threshold = threshold;
    this.name = name;
    this._warnCountdown = 0;
  }
  dispose() {
    this._stacks?.clear();
  }
  check(stack, listenerCount) {
    const threshold = this.threshold;
    if (threshold <= 0 || listenerCount < threshold) {
      return void 0;
    }
    if (!this._stacks) {
      this._stacks = /* @__PURE__ */ new Map();
    }
    const count = this._stacks.get(stack.value) || 0;
    this._stacks.set(stack.value, count + 1);
    this._warnCountdown -= 1;
    if (this._warnCountdown <= 0) {
      this._warnCountdown = threshold * 0.5;
      const [topStack, topCount] = this.getMostFrequentStack();
      const emitterName = /^[0-9a-f]+$/i.test(this.name) ? void 0 : this.name;
      const message = `[${this.name}] potential listener LEAK detected, having ${listenerCount} listeners already. MOST frequent listener (${topCount}):`;
      console.warn(message);
      console.warn(topStack);
      const kind = topCount / listenerCount > 0.3 ? "dominated" : "popular";
      const error = new ListenerLeakError(kind, message, topStack, listenerCount, emitterName);
      this._errorHandler(error);
    }
    return () => {
      const count2 = this._stacks.get(stack.value) || 0;
      this._stacks.set(stack.value, count2 - 1);
    };
  }
  getMostFrequentStack() {
    if (!this._stacks) {
      return void 0;
    }
    let topStack;
    let topCount = 0;
    for (const [stack, count] of this._stacks) {
      if (!topStack || topCount < count) {
        topStack = [stack, count];
        topCount = count;
      }
    }
    return topStack;
  }
};
var Stacktrace = class _Stacktrace {
  static {
    __name(this, "Stacktrace");
  }
  static create() {
    const err = new Error();
    return new _Stacktrace(err.stack ?? "");
  }
  constructor(value) {
    this.value = value;
  }
  print() {
    console.warn(this.value.split("\n").slice(2).join("\n"));
  }
};
var ListenerLeakError = class _ListenerLeakError extends Error {
  static {
    __name(this, "ListenerLeakError");
  }
  constructor(kind, details, stack, listenerCount, emitterName) {
    super(emitterName ? `[${emitterName}] potential listener LEAK detected, ${kind}` : `potential listener LEAK detected, ${kind}`);
    this.name = "ListenerLeakError";
    this.kind = kind;
    this.listenerCount = listenerCount;
    this.details = details;
    this.stack = stack;
  }
  static is(err) {
    return err instanceof _ListenerLeakError || err instanceof Error && typeof err.kind === "string" && typeof err.listenerCount === "number";
  }
};
var ListenerRefusalError = class extends ListenerLeakError {
  static {
    __name(this, "ListenerRefusalError");
  }
  constructor(kind, details, stack, listenerCount, emitterName) {
    super(kind, details, stack, listenerCount, emitterName);
    this.name = "ListenerRefusalError";
  }
};
var id = 0;
var UniqueContainer = class {
  static {
    __name(this, "UniqueContainer");
  }
  constructor(value) {
    this.value = value;
    this.id = id++;
  }
};
var compactionThreshold = 2;
var forEachListener = /* @__PURE__ */ __name((listeners, fn) => {
  if (listeners instanceof UniqueContainer) {
    fn(listeners);
  } else {
    for (let i = 0; i < listeners.length; i++) {
      const l = listeners[i];
      if (l) {
        fn(l);
      }
    }
  }
}, "forEachListener");
var Emitter = class {
  static {
    __name(this, "Emitter");
  }
  constructor(options) {
    this._size = 0;
    this._options = options;
    this._leakageMon = _globalLeakWarningThreshold > 0 || this._options?.leakWarningThreshold ? new LeakageMonitor(options?.onListenerError ?? onUnexpectedError, this._options?.leakWarningThreshold ?? _globalLeakWarningThreshold, this._options?.leakWarningName) : void 0;
    this._perfMon = this._options?._profName ? new EventProfiling(this._options._profName) : void 0;
    this._deliveryQueue = this._options?.deliveryQueue;
  }
  dispose() {
    if (!this._disposed) {
      this._disposed = true;
      if (this._deliveryQueue?.current === this) {
        this._deliveryQueue.reset();
      }
      if (this._listeners) {
        if (_enableDisposeWithListenerWarning) {
          const listeners = this._listeners;
          queueMicrotask(() => {
            forEachListener(listeners, (l) => l.stack?.print());
          });
        }
        this._listeners = void 0;
        this._size = 0;
      }
      this._options?.onDidRemoveLastListener?.();
      this._leakageMon?.dispose();
    }
  }
  /**
   * For the public to allow to subscribe
   * to events from this Emitter
   */
  get event() {
    this._event ??= (callback, thisArgs, disposables) => {
      if (this._leakageMon && this._size > this._leakageMon.threshold ** 2) {
        const message = `[${this._leakageMon.name}] REFUSES to accept new listeners because it exceeded its threshold by far (${this._size} vs ${this._leakageMon.threshold})`;
        console.warn(message);
        const tuple = this._leakageMon.getMostFrequentStack() ?? ["UNKNOWN stack", -1];
        const kind = tuple[1] / this._size > 0.3 ? "dominated" : "popular";
        const error = new ListenerRefusalError(kind, `${message}. HINT: Stack shows most frequent listener (${tuple[1]}-times)`, tuple[0], this._size, this._options?.leakWarningName);
        const errorHandler2 = this._options?.onListenerError || onUnexpectedError;
        errorHandler2(error);
        return Disposable.None;
      }
      if (this._disposed) {
        return Disposable.None;
      }
      if (thisArgs) {
        callback = callback.bind(thisArgs);
      }
      const contained = new UniqueContainer(callback);
      let removeMonitor;
      let stack;
      if (this._leakageMon && this._size >= Math.ceil(this._leakageMon.threshold * 0.2)) {
        contained.stack = Stacktrace.create();
        removeMonitor = this._leakageMon.check(contained.stack, this._size + 1);
      }
      if (_enableDisposeWithListenerWarning) {
        contained.stack = stack ?? Stacktrace.create();
      }
      if (!this._listeners) {
        this._options?.onWillAddFirstListener?.(this);
        this._listeners = contained;
        this._options?.onDidAddFirstListener?.(this);
      } else if (this._listeners instanceof UniqueContainer) {
        this._deliveryQueue ??= new EventDeliveryQueuePrivate();
        this._listeners = [this._listeners, contained];
      } else {
        this._listeners.push(contained);
      }
      this._options?.onDidAddListener?.(this);
      this._size++;
      const result = toDisposable(() => {
        removeMonitor?.();
        this._removeListener(contained);
      });
      addToDisposables(result, disposables);
      return result;
    };
    return this._event;
  }
  _removeListener(listener) {
    this._options?.onWillRemoveListener?.(this);
    if (!this._listeners) {
      return;
    }
    if (this._size === 1) {
      this._listeners = void 0;
      this._options?.onDidRemoveLastListener?.(this);
      this._size = 0;
      return;
    }
    const listeners = this._listeners;
    const index2 = listeners.indexOf(listener);
    if (index2 === -1) {
      console.log("disposed?", this._disposed);
      console.log("size?", this._size);
      console.log("arr?", JSON.stringify(this._listeners));
      throw new Error("Attempted to dispose unknown listener");
    }
    this._size--;
    listeners[index2] = void 0;
    const adjustDeliveryQueue = this._deliveryQueue.current === this;
    if (this._size * compactionThreshold <= listeners.length) {
      let n = 0;
      for (let i = 0; i < listeners.length; i++) {
        if (listeners[i]) {
          listeners[n++] = listeners[i];
        } else if (adjustDeliveryQueue && n < this._deliveryQueue.end) {
          this._deliveryQueue.end--;
          if (n < this._deliveryQueue.i) {
            this._deliveryQueue.i--;
          }
        }
      }
      listeners.length = n;
    }
  }
  _deliver(listener, value) {
    if (!listener) {
      return;
    }
    const errorHandler2 = this._options?.onListenerError || onUnexpectedError;
    if (!errorHandler2) {
      listener.value(value);
      return;
    }
    try {
      listener.value(value);
    } catch (e) {
      errorHandler2(e);
    }
  }
  /** Delivers items in the queue. Assumes the queue is ready to go. */
  _deliverQueue(dq) {
    const listeners = dq.current._listeners;
    while (dq.i < dq.end) {
      this._deliver(listeners[dq.i++], dq.value);
    }
    dq.reset();
  }
  /**
   * To be kept private to fire an event to
   * subscribers
   */
  fire(event) {
    if (this._deliveryQueue?.current) {
      this._deliverQueue(this._deliveryQueue);
      this._perfMon?.stop();
    }
    this._perfMon?.start(this._size);
    if (!this._listeners) {
    } else if (this._listeners instanceof UniqueContainer) {
      this._deliver(this._listeners, event);
    } else {
      const dq = this._deliveryQueue;
      dq.enqueue(this, event, this._listeners.length);
      this._deliverQueue(dq);
    }
    this._perfMon?.stop();
  }
  hasListeners() {
    return this._size > 0;
  }
};
var createEventDeliveryQueue = /* @__PURE__ */ __name(() => new EventDeliveryQueuePrivate(), "createEventDeliveryQueue");
var EventDeliveryQueuePrivate = class {
  static {
    __name(this, "EventDeliveryQueuePrivate");
  }
  constructor() {
    this.i = -1;
    this.end = 0;
  }
  enqueue(emitter, value, end) {
    this.i = 0;
    this.end = end;
    this.current = emitter;
    this.value = value;
  }
  reset() {
    this.i = this.end;
    this.current = void 0;
    this.value = void 0;
  }
};
var AsyncEmitter = class extends Emitter {
  static {
    __name(this, "AsyncEmitter");
  }
  async fireAsync(data, token, promiseJoin) {
    if (!this._listeners) {
      return;
    }
    if (!this._asyncDeliveryQueue) {
      this._asyncDeliveryQueue = new LinkedList();
    }
    forEachListener(this._listeners, (listener) => this._asyncDeliveryQueue.push([listener.value, data]));
    while (this._asyncDeliveryQueue.size > 0 && !token.isCancellationRequested) {
      const [listener, data2] = this._asyncDeliveryQueue.shift();
      const thenables = [];
      const event = {
        ...data2,
        token,
        waitUntil: /* @__PURE__ */ __name((p) => {
          if (Object.isFrozen(thenables)) {
            throw new Error("waitUntil can NOT be called asynchronous");
          }
          if (promiseJoin) {
            p = promiseJoin(p, listener);
          }
          thenables.push(p);
        }, "waitUntil")
      };
      try {
        listener(event);
      } catch (e) {
        onUnexpectedError(e);
        continue;
      }
      Object.freeze(thenables);
      await Promise.allSettled(thenables).then((values) => {
        for (const value of values) {
          if (value.status === "rejected") {
            onUnexpectedError(value.reason);
          }
        }
      });
    }
  }
};
var PauseableEmitter = class extends Emitter {
  static {
    __name(this, "PauseableEmitter");
  }
  get isPaused() {
    return this._isPaused !== 0;
  }
  constructor(options) {
    super(options);
    this._isPaused = 0;
    this._eventQueue = new LinkedList();
    this._mergeFn = options?.merge;
  }
  pause() {
    this._isPaused++;
  }
  resume() {
    if (this._isPaused !== 0 && --this._isPaused === 0) {
      if (this._mergeFn) {
        if (this._eventQueue.size > 0) {
          const events = Array.from(this._eventQueue);
          this._eventQueue.clear();
          super.fire(this._mergeFn(events));
        }
      } else {
        while (!this._isPaused && this._eventQueue.size !== 0) {
          super.fire(this._eventQueue.shift());
        }
      }
    }
  }
  fire(event) {
    if (this._size) {
      if (this._isPaused !== 0) {
        this._eventQueue.push(event);
      } else {
        super.fire(event);
      }
    }
  }
};
var DebounceEmitter = class extends PauseableEmitter {
  static {
    __name(this, "DebounceEmitter");
  }
  constructor(options) {
    super(options);
    this._delay = options.delay ?? 100;
  }
  fire(event) {
    if (!this._handle) {
      this.pause();
      this._handle = setTimeout(() => {
        this._handle = void 0;
        this.resume();
      }, this._delay);
    }
    super.fire(event);
  }
};
var MicrotaskEmitter = class extends Emitter {
  static {
    __name(this, "MicrotaskEmitter");
  }
  constructor(options) {
    super(options);
    this._queuedEvents = [];
    this._mergeFn = options?.merge;
  }
  fire(event) {
    if (!this.hasListeners()) {
      return;
    }
    this._queuedEvents.push(event);
    if (this._queuedEvents.length === 1) {
      queueMicrotask(() => {
        if (this._mergeFn) {
          super.fire(this._mergeFn(this._queuedEvents));
        } else {
          this._queuedEvents.forEach((e) => super.fire(e));
        }
        this._queuedEvents = [];
      });
    }
  }
};
var EventMultiplexer = class {
  static {
    __name(this, "EventMultiplexer");
  }
  constructor() {
    this.hasListeners = false;
    this.events = [];
    this.emitter = new Emitter({
      onWillAddFirstListener: /* @__PURE__ */ __name(() => this.onFirstListenerAdd(), "onWillAddFirstListener"),
      onDidRemoveLastListener: /* @__PURE__ */ __name(() => this.onLastListenerRemove(), "onDidRemoveLastListener")
    });
  }
  get event() {
    return this.emitter.event;
  }
  add(event) {
    const e = { event, listener: null };
    this.events.push(e);
    if (this.hasListeners) {
      this.hook(e);
    }
    const dispose2 = /* @__PURE__ */ __name(() => {
      if (this.hasListeners) {
        this.unhook(e);
      }
      const idx = this.events.indexOf(e);
      this.events.splice(idx, 1);
    }, "dispose");
    return toDisposable(createSingleCallFunction(dispose2));
  }
  onFirstListenerAdd() {
    this.hasListeners = true;
    this.events.forEach((e) => this.hook(e));
  }
  onLastListenerRemove() {
    this.hasListeners = false;
    this.events.forEach((e) => this.unhook(e));
  }
  hook(e) {
    e.listener = e.event((r) => this.emitter.fire(r));
  }
  unhook(e) {
    e.listener?.dispose();
    e.listener = null;
  }
  dispose() {
    this.emitter.dispose();
    for (const e of this.events) {
      e.listener?.dispose();
    }
    this.events = [];
  }
};
var DynamicListEventMultiplexer = class {
  static {
    __name(this, "DynamicListEventMultiplexer");
  }
  constructor(items, onAddItem, onRemoveItem, getEvent) {
    this._store = new DisposableStore();
    const multiplexer = this._store.add(new EventMultiplexer());
    const itemListeners = this._store.add(new DisposableMap());
    function addItem(instance) {
      itemListeners.set(instance, multiplexer.add(getEvent(instance)));
    }
    __name(addItem, "addItem");
    for (const instance of items) {
      addItem(instance);
    }
    this._store.add(onAddItem((instance) => {
      addItem(instance);
    }));
    this._store.add(onRemoveItem((instance) => {
      itemListeners.deleteAndDispose(instance);
    }));
    this.event = multiplexer.event;
  }
  dispose() {
    this._store.dispose();
  }
};
var EventBufferer = class {
  static {
    __name(this, "EventBufferer");
  }
  constructor() {
    this.data = [];
  }
  wrapEvent(event, reduce, initial) {
    return (listener, thisArgs, disposables) => {
      return event((i) => {
        const data = this.data[this.data.length - 1];
        if (!reduce) {
          if (data) {
            data.buffers.push(() => listener.call(thisArgs, i));
          } else {
            listener.call(thisArgs, i);
          }
          return;
        }
        const reduceData = data;
        if (!reduceData) {
          listener.call(thisArgs, reduce(initial, i));
          return;
        }
        reduceData.items ??= [];
        reduceData.items.push(i);
        if (reduceData.buffers.length === 0) {
          data.buffers.push(() => {
            reduceData.reducedResult ??= initial ? reduceData.items.reduce(reduce, initial) : reduceData.items.reduce(reduce);
            listener.call(thisArgs, reduceData.reducedResult);
          });
        }
      }, void 0, disposables);
    };
  }
  bufferEvents(fn) {
    const data = { buffers: new Array() };
    this.data.push(data);
    const r = fn();
    this.data.pop();
    data.buffers.forEach((flush) => flush());
    return r;
  }
};
var Relay = class {
  static {
    __name(this, "Relay");
  }
  constructor() {
    this.listening = false;
    this.inputEvent = Event.None;
    this.inputEventListener = Disposable.None;
    this.emitter = new Emitter({
      onDidAddFirstListener: /* @__PURE__ */ __name(() => {
        this.listening = true;
        this.inputEventListener = this.inputEvent(this.emitter.fire, this.emitter);
      }, "onDidAddFirstListener"),
      onDidRemoveLastListener: /* @__PURE__ */ __name(() => {
        this.listening = false;
        this.inputEventListener.dispose();
      }, "onDidRemoveLastListener")
    });
    this.event = this.emitter.event;
  }
  set input(event) {
    this.inputEvent = event;
    if (this.listening) {
      this.inputEventListener.dispose();
      this.inputEventListener = event(this.emitter.fire, this.emitter);
    }
  }
  dispose() {
    this.inputEventListener.dispose();
    this.emitter.dispose();
  }
};
var ValueWithChangeEvent = class {
  static {
    __name(this, "ValueWithChangeEvent");
  }
  static const(value) {
    return new ConstValueWithChangeEvent(value);
  }
  constructor(_value) {
    this._value = _value;
    this._onDidChange = new Emitter();
    this.onDidChange = this._onDidChange.event;
  }
  get value() {
    return this._value;
  }
  set value(value) {
    if (value !== this._value) {
      this._value = value;
      this._onDidChange.fire(void 0);
    }
  }
};
var ConstValueWithChangeEvent = class {
  static {
    __name(this, "ConstValueWithChangeEvent");
  }
  constructor(value) {
    this.value = value;
    this.onDidChange = Event.None;
  }
};
function trackSetChanges(getData, onDidChangeData, handleItem) {
  const map = new DisposableMap();
  let oldData = new Set(getData());
  for (const d of oldData) {
    map.set(d, handleItem(d));
  }
  const store = new DisposableStore();
  store.add(onDidChangeData(() => {
    const newData = getData();
    const diff = diffSets(oldData, newData);
    for (const r of diff.removed) {
      map.deleteAndDispose(r);
    }
    for (const a of diff.added) {
      map.set(a, handleItem(a));
    }
    oldData = new Set(newData);
  }));
  store.add(map);
  return store;
}
__name(trackSetChanges, "trackSetChanges");
function addToDisposables(result, disposables) {
  if (disposables instanceof DisposableStore) {
    disposables.add(result);
  } else if (Array.isArray(disposables)) {
    disposables.push(result);
  }
}
__name(addToDisposables, "addToDisposables");
function disposeAndRemove(result, disposables) {
  if (disposables instanceof DisposableStore) {
    disposables.delete(result);
  } else if (Array.isArray(disposables)) {
    const index2 = disposables.indexOf(result);
    if (index2 !== -1) {
      disposables.splice(index2, 1);
    }
  }
  result.dispose();
}
__name(disposeAndRemove, "disposeAndRemove");

// Source/Utility/Event/Stream.ts
import { Effect, PubSub } from "effect";
var CreateEventStream = /* @__PURE__ */ __name(() => {
  const VSCodeEmitter = new Emitter();
  const PubSubInstance = Effect.runSync(PubSub.unbounded());
  const Fire = /* @__PURE__ */ __name((Data) => PubSub.publish(PubSubInstance, Data).pipe(
    Effect.andThen(Effect.sync(() => VSCodeEmitter.fire(Data))),
    Effect.asVoid
  ), "Fire");
  const Shutdown = /* @__PURE__ */ __name(() => Effect.all([
    PubSub.shutdown(PubSubInstance),
    Effect.sync(() => VSCodeEmitter.dispose())
  ]).pipe(Effect.asVoid), "Shutdown");
  return {
    Fire,
    PubSub: PubSubInstance,
    event: VSCodeEmitter.event,
    Shutdown
  };
}, "CreateEventStream");
export {
  CreateEventStream
};
//# sourceMappingURL=Stream.js.map
