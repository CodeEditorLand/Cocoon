var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/arraysFind.js
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

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/errors.js
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

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/arrays.js
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
function quickSelect(nth, data, compare2) {
  nth = nth | 0;
  if (nth >= data.length) {
    throw new TypeError("invalid index");
  }
  const pivotValue = data[Math.floor(data.length * Math.random())];
  const lower = [];
  const higher = [];
  const pivots = [];
  for (const value of data) {
    const val = compare2(value, pivotValue);
    if (val < 0) {
      lower.push(value);
    } else if (val > 0) {
      higher.push(value);
    } else {
      pivots.push(value);
    }
  }
  if (nth < lower.length) {
    return quickSelect(nth, lower, compare2);
  } else if (nth < lower.length + pivots.length) {
    return pivots[0];
  } else {
    return quickSelect(nth - (lower.length + pivots.length), higher, compare2);
  }
}
__name(quickSelect, "quickSelect");
function groupBy(data, compare2) {
  const result = [];
  let currentGroup = void 0;
  for (const element of data.slice(0).sort(compare2)) {
    if (!currentGroup || compare2(currentGroup[0], element) !== 0) {
      currentGroup = [element];
      result.push(currentGroup);
    } else {
      currentGroup.push(element);
    }
  }
  return result;
}
__name(groupBy, "groupBy");
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
function sortedDiff(before, after, compare2) {
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
    const n = compare2(beforeElement, afterElement);
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
function delta(before, after, compare2) {
  const splices = sortedDiff(before, after, compare2);
  const removed = [];
  const added = [];
  for (const splice2 of splices) {
    removed.push(...before.slice(splice2.start, splice2.start + splice2.deleteCount));
    added.push(...splice2.toInsert);
  }
  return { removed, added };
}
__name(delta, "delta");
function top(array, compare2, n) {
  if (n === 0) {
    return [];
  }
  const result = array.slice(0, n).sort(compare2);
  topStep(array, compare2, result, n, array.length);
  return result;
}
__name(top, "top");
function topAsync(array, compare2, n, batch, token) {
  if (n === 0) {
    return Promise.resolve([]);
  }
  return new Promise((resolve2, reject) => {
    (async () => {
      const o = array.length;
      const result = array.slice(0, n).sort(compare2);
      for (let i = n, m = Math.min(n + batch, o); i < o; i = m, m = Math.min(m + batch, o)) {
        if (i > n) {
          await new Promise((resolve3) => setTimeout(resolve3));
        }
        if (token && token.isCancellationRequested) {
          throw new CancellationError();
        }
        topStep(array, compare2, result, i, m);
      }
      return result;
    })().then(resolve2, reject);
  });
}
__name(topAsync, "topAsync");
function topStep(array, compare2, result, i, m) {
  for (const n = result.length; i < m; i++) {
    const element = array[i];
    if (compare2(element, result[n - 1]) < 0) {
      result.pop();
      const j = findFirstIdxMonotonousOrArrLen(result, (e) => compare2(element, e) < 0);
      result.splice(j, 0, element);
    }
  }
}
__name(topStep, "topStep");
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
function commonPrefixLength(one, other, equals3 = (a, b) => a === b) {
  let result = 0;
  for (let i = 0, len = Math.min(one.length, other.length); i < len && equals3(one[i], other[i]); i++) {
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
function getActualStartIndex(array, start) {
  return start < 0 ? Math.max(start + array.length, 0) : Math.min(start, array.length);
}
__name(getActualStartIndex, "getActualStartIndex");
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
  takeCount(count2) {
    const result = this.items.slice(this.firstIdx, this.firstIdx + count2);
    this.firstIdx += count2;
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

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/lazy.js
var LazyValueState;
(function(LazyValueState2) {
  LazyValueState2[LazyValueState2["Uninitialized"] = 0] = "Uninitialized";
  LazyValueState2[LazyValueState2["Running"] = 1] = "Running";
  LazyValueState2[LazyValueState2["Completed"] = 2] = "Completed";
})(LazyValueState || (LazyValueState = {}));
var Lazy = class {
  static {
    __name(this, "Lazy");
  }
  constructor(executor) {
    this.executor = executor;
    this._state = LazyValueState.Uninitialized;
  }
  /**
   * True if the lazy value has been resolved.
   */
  get hasValue() {
    return this._state === LazyValueState.Completed;
  }
  /**
   * Get the wrapped value.
   *
   * This will force evaluation of the lazy value if it has not been resolved yet. Lazy values are only
   * resolved once. `getValue` will re-throw exceptions that are hit while resolving the value
   */
  get value() {
    if (this._state === LazyValueState.Uninitialized) {
      this._state = LazyValueState.Running;
      try {
        this._value = this.executor();
      } catch (err) {
        this._error = err;
      } finally {
        this._state = LazyValueState.Completed;
      }
    } else if (this._state === LazyValueState.Running) {
      throw new Error("Cannot read the value of a lazy that is being initialized");
    }
    if (this._error) {
      throw this._error;
    }
    return this._value;
  }
  /**
   * Get the wrapped value without forcing evaluation.
   */
  get rawValue() {
    return this._value;
  }
};

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/collections.js
var _a;
function groupBy2(data, groupFn) {
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
__name(groupBy2, "groupBy");
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

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/map.js
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

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/functional.js
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

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/assert.js
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

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/types.js
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

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/iterator.js
var Iterable;
(function(Iterable2) {
  function is(thing) {
    return !!thing && typeof thing === "object" && typeof thing[Symbol.iterator] === "function";
  }
  __name(is, "is");
  Iterable2.is = is;
  const _empty2 = Object.freeze([]);
  function empty() {
    return _empty2;
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
    return iterable ?? _empty2;
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
    let count2 = 0;
    for (const _ of iterable) {
      count2++;
    }
    return count2;
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

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/lifecycle.js
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
        const continuations = groupBy2([...prevStarts].map((d) => getStackTracePath(d)[i2]), (v) => v);
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

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/stream.js
function isReadable(obj) {
  const candidate = obj;
  if (!candidate) {
    return false;
  }
  return typeof candidate.read === "function";
}
__name(isReadable, "isReadable");
function isReadableStream(obj) {
  const candidate = obj;
  if (!candidate) {
    return false;
  }
  return [candidate.on, candidate.pause, candidate.resume, candidate.destroy].every((fn) => typeof fn === "function");
}
__name(isReadableStream, "isReadableStream");
function isReadableBufferedStream(obj) {
  const candidate = obj;
  if (!candidate) {
    return false;
  }
  return isReadableStream(candidate.stream) && Array.isArray(candidate.buffer) && typeof candidate.ended === "boolean";
}
__name(isReadableBufferedStream, "isReadableBufferedStream");
function newWriteableStream(reducer, options) {
  return new WriteableStreamImpl(reducer, options);
}
__name(newWriteableStream, "newWriteableStream");
var WriteableStreamImpl = class {
  static {
    __name(this, "WriteableStreamImpl");
  }
  /**
   * @param reducer a function that reduces the buffered data into a single object;
   * 				  because some objects can be complex and non-reducible, we also
   * 				  allow passing the explicit `null` value to skip the reduce step
   * @param options stream options
   */
  constructor(reducer, options) {
    this.reducer = reducer;
    this.options = options;
    this.state = {
      flowing: false,
      ended: false,
      destroyed: false
    };
    this.buffer = {
      data: [],
      error: []
    };
    this.listeners = {
      data: [],
      error: [],
      end: []
    };
    this.pendingWritePromises = [];
  }
  pause() {
    if (this.state.destroyed) {
      return;
    }
    this.state.flowing = false;
  }
  resume() {
    if (this.state.destroyed) {
      return;
    }
    if (!this.state.flowing) {
      this.state.flowing = true;
      this.flowData();
      this.flowErrors();
      this.flowEnd();
    }
  }
  write(data) {
    if (this.state.destroyed) {
      return;
    }
    if (this.state.flowing) {
      this.emitData(data);
    } else {
      this.buffer.data.push(data);
      if (typeof this.options?.highWaterMark === "number" && this.buffer.data.length > this.options.highWaterMark) {
        return new Promise((resolve2) => this.pendingWritePromises.push(resolve2));
      }
    }
  }
  error(error) {
    if (this.state.destroyed) {
      return;
    }
    if (this.state.flowing) {
      this.emitError(error);
    } else {
      this.buffer.error.push(error);
    }
  }
  end(result) {
    if (this.state.destroyed) {
      return;
    }
    if (typeof result !== "undefined") {
      this.write(result);
    }
    if (this.state.flowing) {
      this.emitEnd();
      this.destroy();
    } else {
      this.state.ended = true;
    }
  }
  emitData(data) {
    this.listeners.data.slice(0).forEach((listener) => listener(data));
  }
  emitError(error) {
    if (this.listeners.error.length === 0) {
      onUnexpectedError(error);
    } else {
      this.listeners.error.slice(0).forEach((listener) => listener(error));
    }
  }
  emitEnd() {
    this.listeners.end.slice(0).forEach((listener) => listener());
  }
  on(event, callback) {
    if (this.state.destroyed) {
      return;
    }
    switch (event) {
      case "data":
        this.listeners.data.push(callback);
        this.resume();
        break;
      case "end":
        this.listeners.end.push(callback);
        if (this.state.flowing && this.flowEnd()) {
          this.destroy();
        }
        break;
      case "error":
        this.listeners.error.push(callback);
        if (this.state.flowing) {
          this.flowErrors();
        }
        break;
    }
  }
  removeListener(event, callback) {
    if (this.state.destroyed) {
      return;
    }
    let listeners = void 0;
    switch (event) {
      case "data":
        listeners = this.listeners.data;
        break;
      case "end":
        listeners = this.listeners.end;
        break;
      case "error":
        listeners = this.listeners.error;
        break;
    }
    if (listeners) {
      const index2 = listeners.indexOf(callback);
      if (index2 >= 0) {
        listeners.splice(index2, 1);
      }
    }
  }
  flowData() {
    if (this.buffer.data.length === 0) {
      return;
    }
    if (typeof this.reducer === "function") {
      const fullDataBuffer = this.reducer(this.buffer.data);
      this.emitData(fullDataBuffer);
    } else {
      for (const data of this.buffer.data) {
        this.emitData(data);
      }
    }
    this.buffer.data.length = 0;
    const pendingWritePromises = [...this.pendingWritePromises];
    this.pendingWritePromises.length = 0;
    pendingWritePromises.forEach((pendingWritePromise) => pendingWritePromise());
  }
  flowErrors() {
    if (this.listeners.error.length > 0) {
      for (const error of this.buffer.error) {
        this.emitError(error);
      }
      this.buffer.error.length = 0;
    }
  }
  flowEnd() {
    if (this.state.ended) {
      this.emitEnd();
      return this.listeners.end.length > 0;
    }
    return false;
  }
  destroy() {
    if (!this.state.destroyed) {
      this.state.destroyed = true;
      this.state.ended = true;
      this.buffer.data.length = 0;
      this.buffer.error.length = 0;
      this.listeners.data.length = 0;
      this.listeners.error.length = 0;
      this.listeners.end.length = 0;
      this.pendingWritePromises.length = 0;
    }
  }
};
function consumeReadable(readable, reducer) {
  const chunks = [];
  let chunk;
  while ((chunk = readable.read()) !== null) {
    chunks.push(chunk);
  }
  return reducer(chunks);
}
__name(consumeReadable, "consumeReadable");
function peekReadable(readable, reducer, maxChunks) {
  const chunks = [];
  let chunk = void 0;
  while ((chunk = readable.read()) !== null && chunks.length < maxChunks) {
    chunks.push(chunk);
  }
  if (chunk === null && chunks.length > 0) {
    return reducer(chunks);
  }
  return {
    read: /* @__PURE__ */ __name(() => {
      if (chunks.length > 0) {
        return chunks.shift();
      }
      if (typeof chunk !== "undefined") {
        const lastReadChunk = chunk;
        chunk = void 0;
        return lastReadChunk;
      }
      return readable.read();
    }, "read")
  };
}
__name(peekReadable, "peekReadable");
function consumeStream(stream, reducer) {
  return new Promise((resolve2, reject) => {
    const chunks = [];
    listenStream(stream, {
      onData: /* @__PURE__ */ __name((chunk) => {
        if (reducer) {
          chunks.push(chunk);
        }
      }, "onData"),
      onError: /* @__PURE__ */ __name((error) => {
        if (reducer) {
          reject(error);
        } else {
          resolve2(void 0);
        }
      }, "onError"),
      onEnd: /* @__PURE__ */ __name(() => {
        if (reducer) {
          resolve2(reducer(chunks));
        } else {
          resolve2(void 0);
        }
      }, "onEnd")
    });
  });
}
__name(consumeStream, "consumeStream");
function listenStream(stream, listener, token) {
  stream.on("error", (error) => {
    if (!token?.isCancellationRequested) {
      listener.onError(error);
    }
  });
  stream.on("end", () => {
    if (!token?.isCancellationRequested) {
      listener.onEnd();
    }
  });
  stream.on("data", (data) => {
    if (!token?.isCancellationRequested) {
      listener.onData(data);
    }
  });
}
__name(listenStream, "listenStream");
function peekStream(stream, maxChunks) {
  return new Promise((resolve2, reject) => {
    const streamListeners = new DisposableStore();
    const buffer = [];
    const dataListener = /* @__PURE__ */ __name((chunk) => {
      buffer.push(chunk);
      if (buffer.length > maxChunks) {
        streamListeners.dispose();
        stream.pause();
        return resolve2({ stream, buffer, ended: false });
      }
    }, "dataListener");
    const errorListener = /* @__PURE__ */ __name((error) => {
      streamListeners.dispose();
      return reject(error);
    }, "errorListener");
    const endListener = /* @__PURE__ */ __name(() => {
      streamListeners.dispose();
      return resolve2({ stream, buffer, ended: true });
    }, "endListener");
    streamListeners.add(toDisposable(() => stream.removeListener("error", errorListener)));
    stream.on("error", errorListener);
    streamListeners.add(toDisposable(() => stream.removeListener("end", endListener)));
    stream.on("end", endListener);
    streamListeners.add(toDisposable(() => stream.removeListener("data", dataListener)));
    stream.on("data", dataListener);
  });
}
__name(peekStream, "peekStream");
function toStream(t, reducer) {
  const stream = newWriteableStream(reducer);
  stream.end(t);
  return stream;
}
__name(toStream, "toStream");
function emptyStream() {
  const stream = newWriteableStream(() => {
    throw new Error("not supported");
  });
  stream.end();
  return stream;
}
__name(emptyStream, "emptyStream");
function toReadable(t) {
  let consumed = false;
  return {
    read: /* @__PURE__ */ __name(() => {
      if (consumed) {
        return null;
      }
      consumed = true;
      return t;
    }, "read")
  };
}
__name(toReadable, "toReadable");
function transform(stream, transformer, reducer) {
  const target = newWriteableStream(reducer);
  listenStream(stream, {
    onData: /* @__PURE__ */ __name((data) => target.write(transformer.data(data)), "onData"),
    onError: /* @__PURE__ */ __name((error) => target.error(transformer.error ? transformer.error(error) : error), "onError"),
    onEnd: /* @__PURE__ */ __name(() => target.end(), "onEnd")
  });
  return target;
}
__name(transform, "transform");
function prefixedReadable(prefix, readable, reducer) {
  let prefixHandled = false;
  return {
    read: /* @__PURE__ */ __name(() => {
      const chunk = readable.read();
      if (!prefixHandled) {
        prefixHandled = true;
        if (chunk !== null) {
          return reducer([prefix, chunk]);
        }
        return prefix;
      }
      return chunk;
    }, "read")
  };
}
__name(prefixedReadable, "prefixedReadable");
function prefixedStream(prefix, stream, reducer) {
  let prefixHandled = false;
  const target = newWriteableStream(reducer);
  listenStream(stream, {
    onData: /* @__PURE__ */ __name((data) => {
      if (!prefixHandled) {
        prefixHandled = true;
        return target.write(reducer([prefix, data]));
      }
      return target.write(data);
    }, "onData"),
    onError: /* @__PURE__ */ __name((error) => target.error(error), "onError"),
    onEnd: /* @__PURE__ */ __name(() => {
      if (!prefixHandled) {
        prefixHandled = true;
        target.write(prefix);
      }
      target.end();
    }, "onEnd")
  });
  return target;
}
__name(prefixedStream, "prefixedStream");

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/buffer.js
var hasBuffer = typeof Buffer !== "undefined";
var indexOfTable = new Lazy(() => new Uint8Array(256));
var textEncoder;
var textDecoder;
var VSBuffer = class _VSBuffer {
  static {
    __name(this, "VSBuffer");
  }
  /**
   * When running in a nodejs context, the backing store for the returned `VSBuffer` instance
   * might use a nodejs Buffer allocated from node's Buffer pool, which is not transferrable.
   */
  static alloc(byteLength) {
    if (hasBuffer) {
      return new _VSBuffer(Buffer.allocUnsafe(byteLength));
    } else {
      return new _VSBuffer(new Uint8Array(byteLength));
    }
  }
  /**
   * When running in a nodejs context, if `actual` is not a nodejs Buffer, the backing store for
   * the returned `VSBuffer` instance might use a nodejs Buffer allocated from node's Buffer pool,
   * which is not transferrable.
   */
  static wrap(actual) {
    if (hasBuffer && !Buffer.isBuffer(actual)) {
      actual = Buffer.from(actual.buffer, actual.byteOffset, actual.byteLength);
    }
    return new _VSBuffer(actual);
  }
  /**
   * When running in a nodejs context, the backing store for the returned `VSBuffer` instance
   * might use a nodejs Buffer allocated from node's Buffer pool, which is not transferrable.
   */
  static fromString(source, options) {
    const dontUseNodeBuffer = options?.dontUseNodeBuffer || false;
    if (!dontUseNodeBuffer && hasBuffer) {
      return new _VSBuffer(Buffer.from(source));
    } else {
      if (!textEncoder) {
        textEncoder = new TextEncoder();
      }
      return new _VSBuffer(textEncoder.encode(source));
    }
  }
  /**
   * When running in a nodejs context, the backing store for the returned `VSBuffer` instance
   * might use a nodejs Buffer allocated from node's Buffer pool, which is not transferrable.
   */
  static fromByteArray(source) {
    const result = _VSBuffer.alloc(source.length);
    for (let i = 0, len = source.length; i < len; i++) {
      result.buffer[i] = source[i];
    }
    return result;
  }
  /**
   * When running in a nodejs context, the backing store for the returned `VSBuffer` instance
   * might use a nodejs Buffer allocated from node's Buffer pool, which is not transferrable.
   */
  static concat(buffers, totalLength) {
    if (typeof totalLength === "undefined") {
      totalLength = 0;
      for (let i = 0, len = buffers.length; i < len; i++) {
        totalLength += buffers[i].byteLength;
      }
    }
    const ret = _VSBuffer.alloc(totalLength);
    let offset = 0;
    for (let i = 0, len = buffers.length; i < len; i++) {
      const element = buffers[i];
      ret.set(element, offset);
      offset += element.byteLength;
    }
    return ret;
  }
  static isNativeBuffer(buffer) {
    return hasBuffer && Buffer.isBuffer(buffer);
  }
  constructor(buffer) {
    this.buffer = buffer;
    this.byteLength = this.buffer.byteLength;
  }
  /**
   * When running in a nodejs context, the backing store for the returned `VSBuffer` instance
   * might use a nodejs Buffer allocated from node's Buffer pool, which is not transferrable.
   */
  clone() {
    const result = _VSBuffer.alloc(this.byteLength);
    result.set(this);
    return result;
  }
  toString() {
    if (hasBuffer) {
      return this.buffer.toString();
    } else {
      if (!textDecoder) {
        textDecoder = new TextDecoder(void 0, { ignoreBOM: true });
      }
      return textDecoder.decode(this.buffer);
    }
  }
  slice(start, end) {
    return new _VSBuffer(this.buffer.subarray(start, end));
  }
  set(array, offset) {
    if (array instanceof _VSBuffer) {
      this.buffer.set(array.buffer, offset);
    } else if (array instanceof Uint8Array) {
      this.buffer.set(array, offset);
    } else if (array instanceof ArrayBuffer) {
      this.buffer.set(new Uint8Array(array), offset);
    } else if (ArrayBuffer.isView(array)) {
      this.buffer.set(new Uint8Array(array.buffer, array.byteOffset, array.byteLength), offset);
    } else {
      throw new Error(`Unknown argument 'array'`);
    }
  }
  readUInt32BE(offset) {
    return readUInt32BE(this.buffer, offset);
  }
  writeUInt32BE(value, offset) {
    writeUInt32BE(this.buffer, value, offset);
  }
  readUInt32LE(offset) {
    return readUInt32LE(this.buffer, offset);
  }
  writeUInt32LE(value, offset) {
    writeUInt32LE(this.buffer, value, offset);
  }
  readUInt8(offset) {
    return readUInt8(this.buffer, offset);
  }
  writeUInt8(value, offset) {
    writeUInt8(this.buffer, value, offset);
  }
  indexOf(subarray, offset = 0) {
    return binaryIndexOf(this.buffer, subarray instanceof _VSBuffer ? subarray.buffer : subarray, offset);
  }
  equals(other) {
    if (this === other) {
      return true;
    }
    if (this.byteLength !== other.byteLength) {
      return false;
    }
    return this.buffer.every((value, index2) => value === other.buffer[index2]);
  }
};
function binaryIndexOf(haystack, needle, offset = 0) {
  const needleLen = needle.byteLength;
  const haystackLen = haystack.byteLength;
  if (needleLen === 0) {
    return 0;
  }
  if (needleLen === 1) {
    return haystack.indexOf(needle[0], offset);
  }
  if (needleLen > haystackLen - offset) {
    return -1;
  }
  const table = indexOfTable.value;
  table.fill(needle.length);
  for (let i2 = 0; i2 < needle.length; i2++) {
    table[needle[i2]] = needle.length - i2 - 1;
  }
  let i = offset + needle.length - 1;
  let j = i;
  let result = -1;
  while (i < haystackLen) {
    if (haystack[i] === needle[j]) {
      if (j === 0) {
        result = i;
        break;
      }
      i--;
      j--;
    } else {
      i += Math.max(needle.length - j, table[haystack[i]]);
      j = needle.length - 1;
    }
  }
  return result;
}
__name(binaryIndexOf, "binaryIndexOf");
function readUInt16LE(source, offset) {
  return source[offset + 0] << 0 >>> 0 | source[offset + 1] << 8 >>> 0;
}
__name(readUInt16LE, "readUInt16LE");
function writeUInt16LE(destination, value, offset) {
  destination[offset + 0] = value & 255;
  value = value >>> 8;
  destination[offset + 1] = value & 255;
}
__name(writeUInt16LE, "writeUInt16LE");
function readUInt32BE(source, offset) {
  return source[offset] * 2 ** 24 + source[offset + 1] * 2 ** 16 + source[offset + 2] * 2 ** 8 + source[offset + 3];
}
__name(readUInt32BE, "readUInt32BE");
function writeUInt32BE(destination, value, offset) {
  destination[offset + 3] = value;
  value = value >>> 8;
  destination[offset + 2] = value;
  value = value >>> 8;
  destination[offset + 1] = value;
  value = value >>> 8;
  destination[offset] = value;
}
__name(writeUInt32BE, "writeUInt32BE");
function readUInt32LE(source, offset) {
  return source[offset + 0] << 0 >>> 0 | source[offset + 1] << 8 >>> 0 | source[offset + 2] << 16 >>> 0 | source[offset + 3] << 24 >>> 0;
}
__name(readUInt32LE, "readUInt32LE");
function writeUInt32LE(destination, value, offset) {
  destination[offset + 0] = value & 255;
  value = value >>> 8;
  destination[offset + 1] = value & 255;
  value = value >>> 8;
  destination[offset + 2] = value & 255;
  value = value >>> 8;
  destination[offset + 3] = value & 255;
}
__name(writeUInt32LE, "writeUInt32LE");
function readUInt8(source, offset) {
  return source[offset];
}
__name(readUInt8, "readUInt8");
function writeUInt8(destination, value, offset) {
  destination[offset] = value;
}
__name(writeUInt8, "writeUInt8");
function readableToBuffer(readable) {
  return consumeReadable(readable, (chunks) => VSBuffer.concat(chunks));
}
__name(readableToBuffer, "readableToBuffer");
function bufferToReadable(buffer) {
  return toReadable(buffer);
}
__name(bufferToReadable, "bufferToReadable");
function streamToBuffer(stream) {
  return consumeStream(stream, (chunks) => VSBuffer.concat(chunks));
}
__name(streamToBuffer, "streamToBuffer");
async function bufferedStreamToBuffer(bufferedStream) {
  if (bufferedStream.ended) {
    return VSBuffer.concat(bufferedStream.buffer);
  }
  return VSBuffer.concat([
    // Include already read chunks...
    ...bufferedStream.buffer,
    // ...and all additional chunks
    await streamToBuffer(bufferedStream.stream)
  ]);
}
__name(bufferedStreamToBuffer, "bufferedStreamToBuffer");
function bufferToStream(buffer) {
  return toStream(buffer, (chunks) => VSBuffer.concat(chunks));
}
__name(bufferToStream, "bufferToStream");
function streamToBufferReadableStream(stream) {
  return transform(stream, { data: /* @__PURE__ */ __name((data) => typeof data === "string" ? VSBuffer.fromString(data) : VSBuffer.wrap(data), "data") }, (chunks) => VSBuffer.concat(chunks));
}
__name(streamToBufferReadableStream, "streamToBufferReadableStream");
function newWriteableBufferStream(options) {
  return newWriteableStream((chunks) => VSBuffer.concat(chunks), options);
}
__name(newWriteableBufferStream, "newWriteableBufferStream");
function prefixedBufferReadable(prefix, readable) {
  return prefixedReadable(prefix, readable, (chunks) => VSBuffer.concat(chunks));
}
__name(prefixedBufferReadable, "prefixedBufferReadable");
function prefixedBufferStream(prefix, stream) {
  return prefixedStream(prefix, stream, (chunks) => VSBuffer.concat(chunks));
}
__name(prefixedBufferStream, "prefixedBufferStream");
function decodeBase64(encoded) {
  let building = 0;
  let remainder = 0;
  let bufi = 0;
  const buffer = new Uint8Array(Math.floor(encoded.length / 4 * 3));
  const append = /* @__PURE__ */ __name((value) => {
    switch (remainder) {
      case 3:
        buffer[bufi++] = building | value;
        remainder = 0;
        break;
      case 2:
        buffer[bufi++] = building | value >>> 2;
        building = value << 6;
        remainder = 3;
        break;
      case 1:
        buffer[bufi++] = building | value >>> 4;
        building = value << 4;
        remainder = 2;
        break;
      default:
        building = value << 2;
        remainder = 1;
    }
  }, "append");
  for (let i = 0; i < encoded.length; i++) {
    const code = encoded.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      append(code - 65);
    } else if (code >= 97 && code <= 122) {
      append(code - 97 + 26);
    } else if (code >= 48 && code <= 57) {
      append(code - 48 + 52);
    } else if (code === 43 || code === 45) {
      append(62);
    } else if (code === 47 || code === 95) {
      append(63);
    } else if (code === 61) {
      break;
    } else {
      throw new SyntaxError(`Unexpected base64 character ${encoded[i]}`);
    }
  }
  const unpadded = bufi;
  while (remainder > 0) {
    append(0);
  }
  return VSBuffer.wrap(buffer).slice(0, unpadded);
}
__name(decodeBase64, "decodeBase64");
var base64Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var base64UrlSafeAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
function encodeBase64({ buffer }, padded = true, urlSafe = false) {
  const dictionary = urlSafe ? base64UrlSafeAlphabet : base64Alphabet;
  let output = "";
  const remainder = buffer.byteLength % 3;
  let i = 0;
  for (; i < buffer.byteLength - remainder; i += 3) {
    const a = buffer[i + 0];
    const b = buffer[i + 1];
    const c = buffer[i + 2];
    output += dictionary[a >>> 2];
    output += dictionary[(a << 4 | b >>> 4) & 63];
    output += dictionary[(b << 2 | c >>> 6) & 63];
    output += dictionary[c & 63];
  }
  if (remainder === 1) {
    const a = buffer[i + 0];
    output += dictionary[a >>> 2];
    output += dictionary[a << 4 & 63];
    if (padded) {
      output += "==";
    }
  } else if (remainder === 2) {
    const a = buffer[i + 0];
    const b = buffer[i + 1];
    output += dictionary[a >>> 2];
    output += dictionary[(a << 4 | b >>> 4) & 63];
    output += dictionary[b << 2 & 63];
    if (padded) {
      output += "=";
    }
  }
  return output;
}
__name(encodeBase64, "encodeBase64");
var hexChars = "0123456789abcdef";
function encodeHex({ buffer }) {
  let result = "";
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    result += hexChars[byte >>> 4];
    result += hexChars[byte & 15];
  }
  return result;
}
__name(encodeHex, "encodeHex");
function decodeHex(hex) {
  if (hex.length % 2 !== 0) {
    throw new SyntaxError("Hex string must have an even length");
  }
  const out = new Uint8Array(hex.length >> 1);
  for (let i = 0; i < hex.length; ) {
    out[i >> 1] = decodeHexChar(hex, i++) << 4 | decodeHexChar(hex, i++);
  }
  return VSBuffer.wrap(out);
}
__name(decodeHex, "decodeHex");
function decodeHexChar(str, position) {
  const s = str.charCodeAt(position);
  if (s >= 48 && s <= 57) {
    return s - 48;
  } else if (s >= 97 && s <= 102) {
    return s - 87;
  } else if (s >= 65 && s <= 70) {
    return s - 55;
  } else {
    throw new SyntaxError(`Invalid hex character at position ${position}`);
  }
}
__name(decodeHexChar, "decodeHexChar");

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/nls.js
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

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/platform.js
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

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/process.js
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

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/path.js
var CHAR_UPPERCASE_A = 65;
var CHAR_LOWERCASE_A = 97;
var CHAR_UPPERCASE_Z = 90;
var CHAR_LOWERCASE_Z = 122;
var CHAR_DOT = 46;
var CHAR_FORWARD_SLASH = 47;
var CHAR_BACKWARD_SLASH = 92;
var CHAR_COLON = 58;
var CHAR_QUESTION_MARK = 63;
var ErrorInvalidArgType = class extends Error {
  static {
    __name(this, "ErrorInvalidArgType");
  }
  constructor(name, expected, actual) {
    let determiner;
    if (typeof expected === "string" && expected.indexOf("not ") === 0) {
      determiner = "must not be";
      expected = expected.replace(/^not /, "");
    } else {
      determiner = "must be";
    }
    const type = name.indexOf(".") !== -1 ? "property" : "argument";
    let msg = `The "${name}" ${type} ${determiner} of type ${expected}`;
    msg += `. Received type ${typeof actual}`;
    super(msg);
    this.code = "ERR_INVALID_ARG_TYPE";
  }
};
function validateObject(pathObject, name) {
  if (pathObject === null || typeof pathObject !== "object") {
    throw new ErrorInvalidArgType(name, "Object", pathObject);
  }
}
__name(validateObject, "validateObject");
function validateString(value, name) {
  if (typeof value !== "string") {
    throw new ErrorInvalidArgType(name, "string", value);
  }
}
__name(validateString, "validateString");
var platformIsWin32 = platform2 === "win32";
function isPathSeparator(code) {
  return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
}
__name(isPathSeparator, "isPathSeparator");
function isPosixPathSeparator(code) {
  return code === CHAR_FORWARD_SLASH;
}
__name(isPosixPathSeparator, "isPosixPathSeparator");
function isWindowsDeviceRoot(code) {
  return code >= CHAR_UPPERCASE_A && code <= CHAR_UPPERCASE_Z || code >= CHAR_LOWERCASE_A && code <= CHAR_LOWERCASE_Z;
}
__name(isWindowsDeviceRoot, "isWindowsDeviceRoot");
function normalizeString(path, allowAboveRoot, separator, isPathSeparator3) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let code = 0;
  for (let i = 0; i <= path.length; ++i) {
    if (i < path.length) {
      code = path.charCodeAt(i);
    } else if (isPathSeparator3(code)) {
      break;
    } else {
      code = CHAR_FORWARD_SLASH;
    }
    if (isPathSeparator3(code)) {
      if (lastSlash === i - 1 || dots === 1) {
      } else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== CHAR_DOT || res.charCodeAt(res.length - 2) !== CHAR_DOT) {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf(separator);
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf(separator);
            }
            lastSlash = i;
            dots = 0;
            continue;
          } else if (res.length !== 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? `${separator}..` : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `${separator}${path.slice(lastSlash + 1, i)}`;
        } else {
          res = path.slice(lastSlash + 1, i);
        }
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === CHAR_DOT && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
__name(normalizeString, "normalizeString");
function formatExt(ext) {
  return ext ? `${ext[0] === "." ? "" : "."}${ext}` : "";
}
__name(formatExt, "formatExt");
function _format2(sep2, pathObject) {
  validateObject(pathObject, "pathObject");
  const dir = pathObject.dir || pathObject.root;
  const base = pathObject.base || `${pathObject.name || ""}${formatExt(pathObject.ext)}`;
  if (!dir) {
    return base;
  }
  return dir === pathObject.root ? `${dir}${base}` : `${dir}${sep2}${base}`;
}
__name(_format2, "_format");
var win32 = {
  // path.resolve([from ...], to)
  resolve(...pathSegments) {
    let resolvedDevice = "";
    let resolvedTail = "";
    let resolvedAbsolute = false;
    for (let i = pathSegments.length - 1; i >= -1; i--) {
      let path;
      if (i >= 0) {
        path = pathSegments[i];
        validateString(path, `paths[${i}]`);
        if (path.length === 0) {
          continue;
        }
      } else if (resolvedDevice.length === 0) {
        path = cwd();
      } else {
        path = env[`=${resolvedDevice}`] || cwd();
        if (path === void 0 || path.slice(0, 2).toLowerCase() !== resolvedDevice.toLowerCase() && path.charCodeAt(2) === CHAR_BACKWARD_SLASH) {
          path = `${resolvedDevice}\\`;
        }
      }
      const len = path.length;
      let rootEnd = 0;
      let device = "";
      let isAbsolute2 = false;
      const code = path.charCodeAt(0);
      if (len === 1) {
        if (isPathSeparator(code)) {
          rootEnd = 1;
          isAbsolute2 = true;
        }
      } else if (isPathSeparator(code)) {
        isAbsolute2 = true;
        if (isPathSeparator(path.charCodeAt(1))) {
          let j = 2;
          let last = j;
          while (j < len && !isPathSeparator(path.charCodeAt(j))) {
            j++;
          }
          if (j < len && j !== last) {
            const firstPart = path.slice(last, j);
            last = j;
            while (j < len && isPathSeparator(path.charCodeAt(j))) {
              j++;
            }
            if (j < len && j !== last) {
              last = j;
              while (j < len && !isPathSeparator(path.charCodeAt(j))) {
                j++;
              }
              if (j === len || j !== last) {
                device = `\\\\${firstPart}\\${path.slice(last, j)}`;
                rootEnd = j;
              }
            }
          }
        } else {
          rootEnd = 1;
        }
      } else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
        device = path.slice(0, 2);
        rootEnd = 2;
        if (len > 2 && isPathSeparator(path.charCodeAt(2))) {
          isAbsolute2 = true;
          rootEnd = 3;
        }
      }
      if (device.length > 0) {
        if (resolvedDevice.length > 0) {
          if (device.toLowerCase() !== resolvedDevice.toLowerCase()) {
            continue;
          }
        } else {
          resolvedDevice = device;
        }
      }
      if (resolvedAbsolute) {
        if (resolvedDevice.length > 0) {
          break;
        }
      } else {
        resolvedTail = `${path.slice(rootEnd)}\\${resolvedTail}`;
        resolvedAbsolute = isAbsolute2;
        if (isAbsolute2 && resolvedDevice.length > 0) {
          break;
        }
      }
    }
    resolvedTail = normalizeString(resolvedTail, !resolvedAbsolute, "\\", isPathSeparator);
    return resolvedAbsolute ? `${resolvedDevice}\\${resolvedTail}` : `${resolvedDevice}${resolvedTail}` || ".";
  },
  normalize(path) {
    validateString(path, "path");
    const len = path.length;
    if (len === 0) {
      return ".";
    }
    let rootEnd = 0;
    let device;
    let isAbsolute2 = false;
    const code = path.charCodeAt(0);
    if (len === 1) {
      return isPosixPathSeparator(code) ? "\\" : path;
    }
    if (isPathSeparator(code)) {
      isAbsolute2 = true;
      if (isPathSeparator(path.charCodeAt(1))) {
        let j = 2;
        let last = j;
        while (j < len && !isPathSeparator(path.charCodeAt(j))) {
          j++;
        }
        if (j < len && j !== last) {
          const firstPart = path.slice(last, j);
          last = j;
          while (j < len && isPathSeparator(path.charCodeAt(j))) {
            j++;
          }
          if (j < len && j !== last) {
            last = j;
            while (j < len && !isPathSeparator(path.charCodeAt(j))) {
              j++;
            }
            if (j === len) {
              return `\\\\${firstPart}\\${path.slice(last)}\\`;
            }
            if (j !== last) {
              device = `\\\\${firstPart}\\${path.slice(last, j)}`;
              rootEnd = j;
            }
          }
        }
      } else {
        rootEnd = 1;
      }
    } else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
      device = path.slice(0, 2);
      rootEnd = 2;
      if (len > 2 && isPathSeparator(path.charCodeAt(2))) {
        isAbsolute2 = true;
        rootEnd = 3;
      }
    }
    let tail2 = rootEnd < len ? normalizeString(path.slice(rootEnd), !isAbsolute2, "\\", isPathSeparator) : "";
    if (tail2.length === 0 && !isAbsolute2) {
      tail2 = ".";
    }
    if (tail2.length > 0 && isPathSeparator(path.charCodeAt(len - 1))) {
      tail2 += "\\";
    }
    if (!isAbsolute2 && device === void 0 && path.includes(":")) {
      if (tail2.length >= 2 && isWindowsDeviceRoot(tail2.charCodeAt(0)) && tail2.charCodeAt(1) === CHAR_COLON) {
        return `.\\${tail2}`;
      }
      let index2 = path.indexOf(":");
      do {
        if (index2 === len - 1 || isPathSeparator(path.charCodeAt(index2 + 1))) {
          return `.\\${tail2}`;
        }
      } while ((index2 = path.indexOf(":", index2 + 1)) !== -1);
    }
    if (device === void 0) {
      return isAbsolute2 ? `\\${tail2}` : tail2;
    }
    return isAbsolute2 ? `${device}\\${tail2}` : `${device}${tail2}`;
  },
  isAbsolute(path) {
    validateString(path, "path");
    const len = path.length;
    if (len === 0) {
      return false;
    }
    const code = path.charCodeAt(0);
    return isPathSeparator(code) || // Possible device root
    len > 2 && isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON && isPathSeparator(path.charCodeAt(2));
  },
  join(...paths) {
    if (paths.length === 0) {
      return ".";
    }
    let joined;
    let firstPart;
    for (let i = 0; i < paths.length; ++i) {
      const arg = paths[i];
      validateString(arg, "path");
      if (arg.length > 0) {
        if (joined === void 0) {
          joined = firstPart = arg;
        } else {
          joined += `\\${arg}`;
        }
      }
    }
    if (joined === void 0) {
      return ".";
    }
    let needsReplace = true;
    let slashCount = 0;
    if (typeof firstPart === "string" && isPathSeparator(firstPart.charCodeAt(0))) {
      ++slashCount;
      const firstLen = firstPart.length;
      if (firstLen > 1 && isPathSeparator(firstPart.charCodeAt(1))) {
        ++slashCount;
        if (firstLen > 2) {
          if (isPathSeparator(firstPart.charCodeAt(2))) {
            ++slashCount;
          } else {
            needsReplace = false;
          }
        }
      }
    }
    if (needsReplace) {
      while (slashCount < joined.length && isPathSeparator(joined.charCodeAt(slashCount))) {
        slashCount++;
      }
      if (slashCount >= 2) {
        joined = `\\${joined.slice(slashCount)}`;
      }
    }
    return win32.normalize(joined);
  },
  // It will solve the relative path from `from` to `to`, for instance:
  //  from = 'C:\\orandea\\test\\aaa'
  //  to = 'C:\\orandea\\impl\\bbb'
  // The output of the function should be: '..\\..\\impl\\bbb'
  relative(from, to) {
    validateString(from, "from");
    validateString(to, "to");
    if (from === to) {
      return "";
    }
    const fromOrig = win32.resolve(from);
    const toOrig = win32.resolve(to);
    if (fromOrig === toOrig) {
      return "";
    }
    from = fromOrig.toLowerCase();
    to = toOrig.toLowerCase();
    if (from === to) {
      return "";
    }
    if (fromOrig.length !== from.length || toOrig.length !== to.length) {
      const fromSplit = fromOrig.split("\\");
      const toSplit = toOrig.split("\\");
      if (fromSplit[fromSplit.length - 1] === "") {
        fromSplit.pop();
      }
      if (toSplit[toSplit.length - 1] === "") {
        toSplit.pop();
      }
      const fromLen2 = fromSplit.length;
      const toLen2 = toSplit.length;
      const length2 = fromLen2 < toLen2 ? fromLen2 : toLen2;
      let i2;
      for (i2 = 0; i2 < length2; i2++) {
        if (fromSplit[i2].toLowerCase() !== toSplit[i2].toLowerCase()) {
          break;
        }
      }
      if (i2 === 0) {
        return toOrig;
      } else if (i2 === length2) {
        if (toLen2 > length2) {
          return toSplit.slice(i2).join("\\");
        }
        if (fromLen2 > length2) {
          return "..\\".repeat(fromLen2 - 1 - i2) + "..";
        }
        return "";
      }
      return "..\\".repeat(fromLen2 - i2) + toSplit.slice(i2).join("\\");
    }
    let fromStart = 0;
    while (fromStart < from.length && from.charCodeAt(fromStart) === CHAR_BACKWARD_SLASH) {
      fromStart++;
    }
    let fromEnd = from.length;
    while (fromEnd - 1 > fromStart && from.charCodeAt(fromEnd - 1) === CHAR_BACKWARD_SLASH) {
      fromEnd--;
    }
    const fromLen = fromEnd - fromStart;
    let toStart = 0;
    while (toStart < to.length && to.charCodeAt(toStart) === CHAR_BACKWARD_SLASH) {
      toStart++;
    }
    let toEnd = to.length;
    while (toEnd - 1 > toStart && to.charCodeAt(toEnd - 1) === CHAR_BACKWARD_SLASH) {
      toEnd--;
    }
    const toLen = toEnd - toStart;
    const length = fromLen < toLen ? fromLen : toLen;
    let lastCommonSep = -1;
    let i = 0;
    for (; i < length; i++) {
      const fromCode = from.charCodeAt(fromStart + i);
      if (fromCode !== to.charCodeAt(toStart + i)) {
        break;
      } else if (fromCode === CHAR_BACKWARD_SLASH) {
        lastCommonSep = i;
      }
    }
    if (i !== length) {
      if (lastCommonSep === -1) {
        return toOrig;
      }
    } else {
      if (toLen > length) {
        if (to.charCodeAt(toStart + i) === CHAR_BACKWARD_SLASH) {
          return toOrig.slice(toStart + i + 1);
        }
        if (i === 2) {
          return toOrig.slice(toStart + i);
        }
      }
      if (fromLen > length) {
        if (from.charCodeAt(fromStart + i) === CHAR_BACKWARD_SLASH) {
          lastCommonSep = i;
        } else if (i === 2) {
          lastCommonSep = 3;
        }
      }
      if (lastCommonSep === -1) {
        lastCommonSep = 0;
      }
    }
    let out = "";
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === CHAR_BACKWARD_SLASH) {
        out += out.length === 0 ? ".." : "\\..";
      }
    }
    toStart += lastCommonSep;
    if (out.length > 0) {
      return `${out}${toOrig.slice(toStart, toEnd)}`;
    }
    if (toOrig.charCodeAt(toStart) === CHAR_BACKWARD_SLASH) {
      ++toStart;
    }
    return toOrig.slice(toStart, toEnd);
  },
  toNamespacedPath(path) {
    if (typeof path !== "string" || path.length === 0) {
      return path;
    }
    const resolvedPath = win32.resolve(path);
    if (resolvedPath.length <= 2) {
      return path;
    }
    if (resolvedPath.charCodeAt(0) === CHAR_BACKWARD_SLASH) {
      if (resolvedPath.charCodeAt(1) === CHAR_BACKWARD_SLASH) {
        const code = resolvedPath.charCodeAt(2);
        if (code !== CHAR_QUESTION_MARK && code !== CHAR_DOT) {
          return `\\\\?\\UNC\\${resolvedPath.slice(2)}`;
        }
      }
    } else if (isWindowsDeviceRoot(resolvedPath.charCodeAt(0)) && resolvedPath.charCodeAt(1) === CHAR_COLON && resolvedPath.charCodeAt(2) === CHAR_BACKWARD_SLASH) {
      return `\\\\?\\${resolvedPath}`;
    }
    return resolvedPath;
  },
  dirname(path) {
    validateString(path, "path");
    const len = path.length;
    if (len === 0) {
      return ".";
    }
    let rootEnd = -1;
    let offset = 0;
    const code = path.charCodeAt(0);
    if (len === 1) {
      return isPathSeparator(code) ? path : ".";
    }
    if (isPathSeparator(code)) {
      rootEnd = offset = 1;
      if (isPathSeparator(path.charCodeAt(1))) {
        let j = 2;
        let last = j;
        while (j < len && !isPathSeparator(path.charCodeAt(j))) {
          j++;
        }
        if (j < len && j !== last) {
          last = j;
          while (j < len && isPathSeparator(path.charCodeAt(j))) {
            j++;
          }
          if (j < len && j !== last) {
            last = j;
            while (j < len && !isPathSeparator(path.charCodeAt(j))) {
              j++;
            }
            if (j === len) {
              return path;
            }
            if (j !== last) {
              rootEnd = offset = j + 1;
            }
          }
        }
      }
    } else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
      rootEnd = len > 2 && isPathSeparator(path.charCodeAt(2)) ? 3 : 2;
      offset = rootEnd;
    }
    let end = -1;
    let matchedSlash = true;
    for (let i = len - 1; i >= offset; --i) {
      if (isPathSeparator(path.charCodeAt(i))) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
        matchedSlash = false;
      }
    }
    if (end === -1) {
      if (rootEnd === -1) {
        return ".";
      }
      end = rootEnd;
    }
    return path.slice(0, end);
  },
  basename(path, suffix) {
    if (suffix !== void 0) {
      validateString(suffix, "suffix");
    }
    validateString(path, "path");
    let start = 0;
    let end = -1;
    let matchedSlash = true;
    let i;
    if (path.length >= 2 && isWindowsDeviceRoot(path.charCodeAt(0)) && path.charCodeAt(1) === CHAR_COLON) {
      start = 2;
    }
    if (suffix !== void 0 && suffix.length > 0 && suffix.length <= path.length) {
      if (suffix === path) {
        return "";
      }
      let extIdx = suffix.length - 1;
      let firstNonSlashEnd = -1;
      for (i = path.length - 1; i >= start; --i) {
        const code = path.charCodeAt(i);
        if (isPathSeparator(code)) {
          if (!matchedSlash) {
            start = i + 1;
            break;
          }
        } else {
          if (firstNonSlashEnd === -1) {
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            if (code === suffix.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                end = i;
              }
            } else {
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }
      if (start === end) {
        end = firstNonSlashEnd;
      } else if (end === -1) {
        end = path.length;
      }
      return path.slice(start, end);
    }
    for (i = path.length - 1; i >= start; --i) {
      if (isPathSeparator(path.charCodeAt(i))) {
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
    }
    if (end === -1) {
      return "";
    }
    return path.slice(start, end);
  },
  extname(path) {
    validateString(path, "path");
    let start = 0;
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let preDotState = 0;
    if (path.length >= 2 && path.charCodeAt(1) === CHAR_COLON && isWindowsDeviceRoot(path.charCodeAt(0))) {
      start = startPart = 2;
    }
    for (let i = path.length - 1; i >= start; --i) {
      const code = path.charCodeAt(i);
      if (isPathSeparator(code)) {
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
      if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
      if (code === CHAR_DOT) {
        if (startDot === -1) {
          startDot = i;
        } else if (preDotState !== 1) {
          preDotState = 1;
        }
      } else if (startDot !== -1) {
        preDotState = -1;
      }
    }
    if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
    preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return "";
    }
    return path.slice(startDot, end);
  },
  format: _format2.bind(null, "\\"),
  parse(path) {
    validateString(path, "path");
    const ret = { root: "", dir: "", base: "", ext: "", name: "" };
    if (path.length === 0) {
      return ret;
    }
    const len = path.length;
    let rootEnd = 0;
    let code = path.charCodeAt(0);
    if (len === 1) {
      if (isPathSeparator(code)) {
        ret.root = ret.dir = path;
        return ret;
      }
      ret.base = ret.name = path;
      return ret;
    }
    if (isPathSeparator(code)) {
      rootEnd = 1;
      if (isPathSeparator(path.charCodeAt(1))) {
        let j = 2;
        let last = j;
        while (j < len && !isPathSeparator(path.charCodeAt(j))) {
          j++;
        }
        if (j < len && j !== last) {
          last = j;
          while (j < len && isPathSeparator(path.charCodeAt(j))) {
            j++;
          }
          if (j < len && j !== last) {
            last = j;
            while (j < len && !isPathSeparator(path.charCodeAt(j))) {
              j++;
            }
            if (j === len) {
              rootEnd = j;
            } else if (j !== last) {
              rootEnd = j + 1;
            }
          }
        }
      }
    } else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
      if (len <= 2) {
        ret.root = ret.dir = path;
        return ret;
      }
      rootEnd = 2;
      if (isPathSeparator(path.charCodeAt(2))) {
        if (len === 3) {
          ret.root = ret.dir = path;
          return ret;
        }
        rootEnd = 3;
      }
    }
    if (rootEnd > 0) {
      ret.root = path.slice(0, rootEnd);
    }
    let startDot = -1;
    let startPart = rootEnd;
    let end = -1;
    let matchedSlash = true;
    let i = path.length - 1;
    let preDotState = 0;
    for (; i >= rootEnd; --i) {
      code = path.charCodeAt(i);
      if (isPathSeparator(code)) {
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
      if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
      if (code === CHAR_DOT) {
        if (startDot === -1) {
          startDot = i;
        } else if (preDotState !== 1) {
          preDotState = 1;
        }
      } else if (startDot !== -1) {
        preDotState = -1;
      }
    }
    if (end !== -1) {
      if (startDot === -1 || // We saw a non-dot character immediately before the dot
      preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
      preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        ret.base = ret.name = path.slice(startPart, end);
      } else {
        ret.name = path.slice(startPart, startDot);
        ret.base = path.slice(startPart, end);
        ret.ext = path.slice(startDot, end);
      }
    }
    if (startPart > 0 && startPart !== rootEnd) {
      ret.dir = path.slice(0, startPart - 1);
    } else {
      ret.dir = ret.root;
    }
    return ret;
  },
  sep: "\\",
  delimiter: ";",
  win32: null,
  posix: null
};
var posixCwd = (() => {
  if (platformIsWin32) {
    const regexp = /\\/g;
    return () => {
      const cwd2 = cwd().replace(regexp, "/");
      return cwd2.slice(cwd2.indexOf("/"));
    };
  }
  return () => cwd();
})();
var posix = {
  // path.resolve([from ...], to)
  resolve(...pathSegments) {
    let resolvedPath = "";
    let resolvedAbsolute = false;
    for (let i = pathSegments.length - 1; i >= 0 && !resolvedAbsolute; i--) {
      const path = pathSegments[i];
      validateString(path, `paths[${i}]`);
      if (path.length === 0) {
        continue;
      }
      resolvedPath = `${path}/${resolvedPath}`;
      resolvedAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    }
    if (!resolvedAbsolute) {
      const cwd2 = posixCwd();
      resolvedPath = `${cwd2}/${resolvedPath}`;
      resolvedAbsolute = cwd2.charCodeAt(0) === CHAR_FORWARD_SLASH;
    }
    resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute, "/", isPosixPathSeparator);
    if (resolvedAbsolute) {
      return `/${resolvedPath}`;
    }
    return resolvedPath.length > 0 ? resolvedPath : ".";
  },
  normalize(path) {
    validateString(path, "path");
    if (path.length === 0) {
      return ".";
    }
    const isAbsolute2 = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    const trailingSeparator = path.charCodeAt(path.length - 1) === CHAR_FORWARD_SLASH;
    path = normalizeString(path, !isAbsolute2, "/", isPosixPathSeparator);
    if (path.length === 0) {
      if (isAbsolute2) {
        return "/";
      }
      return trailingSeparator ? "./" : ".";
    }
    if (trailingSeparator) {
      path += "/";
    }
    return isAbsolute2 ? `/${path}` : path;
  },
  isAbsolute(path) {
    validateString(path, "path");
    return path.length > 0 && path.charCodeAt(0) === CHAR_FORWARD_SLASH;
  },
  join(...paths) {
    if (paths.length === 0) {
      return ".";
    }
    const path = [];
    for (let i = 0; i < paths.length; ++i) {
      const arg = paths[i];
      validateString(arg, "path");
      if (arg.length > 0) {
        path.push(arg);
      }
    }
    if (path.length === 0) {
      return ".";
    }
    return posix.normalize(path.join("/"));
  },
  relative(from, to) {
    validateString(from, "from");
    validateString(to, "to");
    if (from === to) {
      return "";
    }
    from = posix.resolve(from);
    to = posix.resolve(to);
    if (from === to) {
      return "";
    }
    const fromStart = 1;
    const fromEnd = from.length;
    const fromLen = fromEnd - fromStart;
    const toStart = 1;
    const toLen = to.length - toStart;
    const length = fromLen < toLen ? fromLen : toLen;
    let lastCommonSep = -1;
    let i = 0;
    for (; i < length; i++) {
      const fromCode = from.charCodeAt(fromStart + i);
      if (fromCode !== to.charCodeAt(toStart + i)) {
        break;
      } else if (fromCode === CHAR_FORWARD_SLASH) {
        lastCommonSep = i;
      }
    }
    if (i === length) {
      if (toLen > length) {
        if (to.charCodeAt(toStart + i) === CHAR_FORWARD_SLASH) {
          return to.slice(toStart + i + 1);
        }
        if (i === 0) {
          return to.slice(toStart + i);
        }
      } else if (fromLen > length) {
        if (from.charCodeAt(fromStart + i) === CHAR_FORWARD_SLASH) {
          lastCommonSep = i;
        } else if (i === 0) {
          lastCommonSep = 0;
        }
      }
    }
    let out = "";
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === CHAR_FORWARD_SLASH) {
        out += out.length === 0 ? ".." : "/..";
      }
    }
    return `${out}${to.slice(toStart + lastCommonSep)}`;
  },
  toNamespacedPath(path) {
    return path;
  },
  dirname(path) {
    validateString(path, "path");
    if (path.length === 0) {
      return ".";
    }
    const hasRoot = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    let end = -1;
    let matchedSlash = true;
    for (let i = path.length - 1; i >= 1; --i) {
      if (path.charCodeAt(i) === CHAR_FORWARD_SLASH) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
        matchedSlash = false;
      }
    }
    if (end === -1) {
      return hasRoot ? "/" : ".";
    }
    if (hasRoot && end === 1) {
      return "//";
    }
    return path.slice(0, end);
  },
  basename(path, suffix) {
    if (suffix !== void 0) {
      validateString(suffix, "suffix");
    }
    validateString(path, "path");
    let start = 0;
    let end = -1;
    let matchedSlash = true;
    let i;
    if (suffix !== void 0 && suffix.length > 0 && suffix.length <= path.length) {
      if (suffix === path) {
        return "";
      }
      let extIdx = suffix.length - 1;
      let firstNonSlashEnd = -1;
      for (i = path.length - 1; i >= 0; --i) {
        const code = path.charCodeAt(i);
        if (code === CHAR_FORWARD_SLASH) {
          if (!matchedSlash) {
            start = i + 1;
            break;
          }
        } else {
          if (firstNonSlashEnd === -1) {
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            if (code === suffix.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                end = i;
              }
            } else {
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }
      if (start === end) {
        end = firstNonSlashEnd;
      } else if (end === -1) {
        end = path.length;
      }
      return path.slice(start, end);
    }
    for (i = path.length - 1; i >= 0; --i) {
      if (path.charCodeAt(i) === CHAR_FORWARD_SLASH) {
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
    }
    if (end === -1) {
      return "";
    }
    return path.slice(start, end);
  },
  extname(path) {
    validateString(path, "path");
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let preDotState = 0;
    for (let i = path.length - 1; i >= 0; --i) {
      const char = path[i];
      if (char === "/") {
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
      if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
      if (char === ".") {
        if (startDot === -1) {
          startDot = i;
        } else if (preDotState !== 1) {
          preDotState = 1;
        }
      } else if (startDot !== -1) {
        preDotState = -1;
      }
    }
    if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
    preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return "";
    }
    return path.slice(startDot, end);
  },
  format: _format2.bind(null, "/"),
  parse(path) {
    validateString(path, "path");
    const ret = { root: "", dir: "", base: "", ext: "", name: "" };
    if (path.length === 0) {
      return ret;
    }
    const isAbsolute2 = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    let start;
    if (isAbsolute2) {
      ret.root = "/";
      start = 1;
    } else {
      start = 0;
    }
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let i = path.length - 1;
    let preDotState = 0;
    for (; i >= start; --i) {
      const code = path.charCodeAt(i);
      if (code === CHAR_FORWARD_SLASH) {
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
      if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
      if (code === CHAR_DOT) {
        if (startDot === -1) {
          startDot = i;
        } else if (preDotState !== 1) {
          preDotState = 1;
        }
      } else if (startDot !== -1) {
        preDotState = -1;
      }
    }
    if (end !== -1) {
      const start2 = startPart === 0 && isAbsolute2 ? 1 : startPart;
      if (startDot === -1 || // We saw a non-dot character immediately before the dot
      preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
      preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        ret.base = ret.name = path.slice(start2, end);
      } else {
        ret.name = path.slice(start2, startDot);
        ret.base = path.slice(start2, end);
        ret.ext = path.slice(startDot, end);
      }
    }
    if (startPart > 0) {
      ret.dir = path.slice(0, startPart - 1);
    } else if (isAbsolute2) {
      ret.dir = "/";
    }
    return ret;
  },
  sep: "/",
  delimiter: ":",
  win32: null,
  posix: null
};
posix.win32 = win32.win32 = win32;
posix.posix = win32.posix = posix;
var normalize = platformIsWin32 ? win32.normalize : posix.normalize;
var isAbsolute = platformIsWin32 ? win32.isAbsolute : posix.isAbsolute;
var join = platformIsWin32 ? win32.join : posix.join;
var resolve = platformIsWin32 ? win32.resolve : posix.resolve;
var relative = platformIsWin32 ? win32.relative : posix.relative;
var dirname = platformIsWin32 ? win32.dirname : posix.dirname;
var basename = platformIsWin32 ? win32.basename : posix.basename;
var extname = platformIsWin32 ? win32.extname : posix.extname;
var format = platformIsWin32 ? win32.format : posix.format;
var parse = platformIsWin32 ? win32.parse : posix.parse;
var toNamespacedPath = platformIsWin32 ? win32.toNamespacedPath : posix.toNamespacedPath;
var sep = platformIsWin32 ? win32.sep : posix.sep;
var delimiter = platformIsWin32 ? win32.delimiter : posix.delimiter;

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/mime.js
var Mimes = Object.freeze({
  text: "text/plain",
  binary: "application/octet-stream",
  unknown: "application/unknown",
  markdown: "text/markdown",
  latex: "text/latex",
  uriList: "text/uri-list",
  html: "text/html"
});
var mapExtToTextMimes = {
  ".css": "text/css",
  ".csv": "text/csv",
  ".htm": "text/html",
  ".html": "text/html",
  ".ics": "text/calendar",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".txt": "text/plain",
  ".xml": "text/xml"
};
var mapExtToMediaMimes = {
  ".aac": "audio/x-aac",
  ".avi": "video/x-msvideo",
  ".bmp": "image/bmp",
  ".flv": "video/x-flv",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".jpe": ["image/jpg", "image/jpeg"],
  ".jpeg": ["image/jpg", "image/jpeg"],
  ".jpg": ["image/jpg", "image/jpeg"],
  ".m1v": "video/mpeg",
  ".m2a": "audio/mpeg",
  ".m2v": "video/mpeg",
  ".m3a": "audio/mpeg",
  ".mid": "audio/midi",
  ".midi": "audio/midi",
  ".mk3d": "video/x-matroska",
  ".mks": "video/x-matroska",
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",
  ".movie": "video/x-sgi-movie",
  ".mp2": "audio/mpeg",
  ".mp2a": "audio/mpeg",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".mp4a": "audio/mp4",
  ".mp4v": "video/mp4",
  ".mpe": "video/mpeg",
  ".mpeg": "video/mpeg",
  ".mpg": "video/mpeg",
  ".mpg4": "video/mp4",
  ".mpga": "audio/mpeg",
  ".oga": "audio/ogg",
  ".ogg": "audio/ogg",
  ".opus": "audio/opus",
  ".ogv": "video/ogg",
  ".png": "image/png",
  ".psd": "image/vnd.adobe.photoshop",
  ".qt": "video/quicktime",
  ".spx": "audio/ogg",
  ".svg": "image/svg+xml",
  ".tga": "image/x-tga",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".wav": "audio/x-wav",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".wma": "audio/x-ms-wma",
  ".wmv": "video/x-ms-wmv",
  ".woff": "application/font-woff"
};
function getMediaOrTextMime(path) {
  const ext = extname(path);
  const textMime = mapExtToTextMimes[ext.toLowerCase()];
  if (textMime !== void 0) {
    return textMime;
  } else {
    return getMediaMime(path);
  }
}
__name(getMediaOrTextMime, "getMediaOrTextMime");
function getMediaMime(path) {
  const ext = extname(path);
  const mimeType = mapExtToMediaMimes[ext.toLowerCase()];
  return Array.isArray(mimeType) ? mimeType[0] : mimeType;
}
__name(getMediaMime, "getMediaMime");
function getExtensionForMimeType(mimeType) {
  for (const extension in mapExtToMediaMimes) {
    const value = mapExtToMediaMimes[extension];
    if (Array.isArray(value) ? value.includes(mimeType) : value === mimeType) {
      return extension;
    }
  }
  return void 0;
}
__name(getExtensionForMimeType, "getExtensionForMimeType");
var _simplePattern = /^(.+)\/(.+?)(;.+)?$/;
function normalizeMimeType(mimeType, strict) {
  const match = _simplePattern.exec(mimeType);
  if (!match) {
    return strict ? void 0 : mimeType;
  }
  return `${match[1].toLowerCase()}/${match[2].toLowerCase()}${match[3] ?? ""}`;
}
__name(normalizeMimeType, "normalizeMimeType");
function isTextStreamMime(mimeType) {
  return ["application/vnd.code.notebook.stdout", "application/vnd.code.notebook.stderr"].includes(mimeType);
}
__name(isTextStreamMime, "isTextStreamMime");

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/linkedList.js
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

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/stopwatch.js
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

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/event.js
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
      let count2 = 0;
      options.onDidAddListener = () => {
        if (++count2 === 2) {
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
  function latch(event, equals3 = (a, b) => a === b, disposable) {
    let firstCall = true;
    let cache;
    return filter(event, (value) => {
      const shouldEmit = firstCall || !equals3(value, cache);
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
    latch(equals3 = (a, b) => a === b) {
      let firstCall = true;
      let cache;
      this.steps.push((value) => {
        const shouldEmit = firstCall || !equals3(value, cache);
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
    const promise = new Promise((resolve2) => {
      listener = once(event)(resolve2);
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
      let count2 = 0;
      let didChange = false;
      const observer = {
        beginUpdate() {
          count2++;
        },
        endUpdate() {
          count2--;
          if (count2 === 0) {
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
    const count2 = this._stacks.get(stack.value) || 0;
    this._stacks.set(stack.value, count2 + 1);
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
      const count3 = this._stacks.get(stack.value) || 0;
      this._stacks.set(stack.value, count3 - 1);
    };
  }
  getMostFrequentStack() {
    if (!this._stacks) {
      return void 0;
    }
    let topStack;
    let topCount = 0;
    for (const [stack, count2] of this._stacks) {
      if (!topStack || topCount < count2) {
        topStack = [stack, count2];
        topCount = count2;
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

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/cancellation.js
var shortcutEvent = Object.freeze(function(callback, context) {
  const handle = setTimeout(callback.bind(context), 0);
  return { dispose() {
    clearTimeout(handle);
  } };
});
var CancellationToken;
(function(CancellationToken2) {
  function isCancellationToken(thing) {
    if (thing === CancellationToken2.None || thing === CancellationToken2.Cancelled) {
      return true;
    }
    if (thing instanceof MutableToken) {
      return true;
    }
    if (!thing || typeof thing !== "object") {
      return false;
    }
    return typeof thing.isCancellationRequested === "boolean" && typeof thing.onCancellationRequested === "function";
  }
  __name(isCancellationToken, "isCancellationToken");
  CancellationToken2.isCancellationToken = isCancellationToken;
  CancellationToken2.None = Object.freeze({
    isCancellationRequested: false,
    onCancellationRequested: Event.None
  });
  CancellationToken2.Cancelled = Object.freeze({
    isCancellationRequested: true,
    onCancellationRequested: shortcutEvent
  });
})(CancellationToken || (CancellationToken = {}));
var MutableToken = class {
  static {
    __name(this, "MutableToken");
  }
  constructor() {
    this._isCancelled = false;
    this._emitter = null;
  }
  cancel() {
    if (!this._isCancelled) {
      this._isCancelled = true;
      if (this._emitter) {
        this._emitter.fire(void 0);
        this.dispose();
      }
    }
  }
  get isCancellationRequested() {
    return this._isCancelled;
  }
  get onCancellationRequested() {
    if (this._isCancelled) {
      return shortcutEvent;
    }
    if (!this._emitter) {
      this._emitter = new Emitter();
    }
    return this._emitter.event;
  }
  dispose() {
    if (this._emitter) {
      this._emitter.dispose();
      this._emitter = null;
    }
  }
};
var CancellationTokenSource = class {
  static {
    __name(this, "CancellationTokenSource");
  }
  constructor(parent) {
    this._token = void 0;
    this._parentListener = void 0;
    this._parentListener = parent && parent.onCancellationRequested(this.cancel, this);
  }
  get token() {
    if (!this._token) {
      this._token = new MutableToken();
    }
    return this._token;
  }
  cancel() {
    if (!this._token) {
      this._token = CancellationToken.Cancelled;
    } else if (this._token instanceof MutableToken) {
      this._token.cancel();
    }
  }
  dispose(cancel = false) {
    if (cancel) {
      this.cancel();
    }
    this._parentListener?.dispose();
    if (!this._token) {
      this._token = CancellationToken.None;
    } else if (this._token instanceof MutableToken) {
      this._token.dispose();
    }
  }
};
function cancelOnDispose(store) {
  const source = new CancellationTokenSource();
  store.add({ dispose() {
    source.cancel();
  } });
  return source.token;
}
__name(cancelOnDispose, "cancelOnDispose");
var CancellationTokenPool = class {
  static {
    __name(this, "CancellationTokenPool");
  }
  constructor() {
    this._source = new CancellationTokenSource();
    this._listeners = new DisposableStore();
    this._total = 0;
    this._cancelled = 0;
    this._isDone = false;
  }
  get token() {
    return this._source.token;
  }
  /**
   * Add a token to the pool. If the token is already cancelled it is counted
   * immediately. Tokens added after the pool token has been cancelled are ignored.
   */
  add(token) {
    if (this._isDone) {
      return;
    }
    this._total++;
    if (token.isCancellationRequested) {
      this._cancelled++;
      this._check();
      return;
    }
    const d = token.onCancellationRequested(() => {
      d.dispose();
      this._cancelled++;
      this._check();
    });
    this._listeners.add(d);
  }
  _check() {
    if (!this._isDone && this._total > 0 && this._total === this._cancelled) {
      this._isDone = true;
      this._listeners.dispose();
      this._source.cancel();
    }
  }
  dispose() {
    this._listeners.dispose();
    this._source.dispose();
  }
};

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/cache.js
var Cache2 = class {
  static {
    __name(this, "Cache");
  }
  constructor(task) {
    this.task = task;
    this.result = null;
  }
  get() {
    if (this.result) {
      return this.result;
    }
    const cts = new CancellationTokenSource();
    const promise = this.task(cts.token);
    this.result = {
      promise,
      dispose: /* @__PURE__ */ __name(() => {
        this.result = null;
        cts.cancel();
        cts.dispose();
      }, "dispose")
    };
    return this.result;
  }
};
function identity(t) {
  return t;
}
__name(identity, "identity");
var LRUCachedFunction = class {
  static {
    __name(this, "LRUCachedFunction");
  }
  constructor(arg1, arg2) {
    this.lastCache = void 0;
    this.lastArgKey = void 0;
    if (typeof arg1 === "function") {
      this._fn = arg1;
      this._computeKey = identity;
    } else {
      this._fn = arg2;
      this._computeKey = arg1.getCacheKey;
    }
  }
  get(arg) {
    const key = this._computeKey(arg);
    if (this.lastArgKey !== key) {
      this.lastArgKey = key;
      this.lastCache = this._fn(arg);
    }
    return this.lastCache;
  }
};
var CachedFunction = class {
  static {
    __name(this, "CachedFunction");
  }
  get cachedValues() {
    return this._map;
  }
  constructor(arg1, arg2) {
    this._map = /* @__PURE__ */ new Map();
    this._map2 = /* @__PURE__ */ new Map();
    if (typeof arg1 === "function") {
      this._fn = arg1;
      this._computeKey = identity;
    } else {
      this._fn = arg2;
      this._computeKey = arg1.getCacheKey;
    }
  }
  get(arg) {
    const key = this._computeKey(arg);
    if (this._map2.has(key)) {
      return this._map2.get(key);
    }
    const value = this._fn(arg);
    this._map.set(arg, value);
    this._map2.set(key, value);
    return value;
  }
};
var WeakCachedFunction = class {
  static {
    __name(this, "WeakCachedFunction");
  }
  constructor(arg1, arg2) {
    this._map = /* @__PURE__ */ new WeakMap();
    if (typeof arg1 === "function") {
      this._fn = arg1;
      this._computeKey = identity;
    } else {
      this._fn = arg2;
      this._computeKey = arg1.getCacheKey;
    }
  }
  get(arg) {
    const key = this._computeKey(arg);
    if (this._map.has(key)) {
      return this._map.get(key);
    }
    const value = this._fn(arg);
    this._map.set(key, value);
    return value;
  }
};

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/strings.js
function isFalsyOrWhitespace(str) {
  if (!str || typeof str !== "string") {
    return true;
  }
  return str.trim().length === 0;
}
__name(isFalsyOrWhitespace, "isFalsyOrWhitespace");
var _formatRegexp = /{(\d+)}/g;
function format2(value, ...args) {
  if (args.length === 0) {
    return value;
  }
  return value.replace(_formatRegexp, function(match, group) {
    const idx = parseInt(group, 10);
    return isNaN(idx) || idx < 0 || idx >= args.length ? match : args[idx];
  });
}
__name(format2, "format");
var _format2Regexp = /{([^}]+)}/g;
function format22(template, values) {
  if (Object.keys(values).length === 0) {
    return template;
  }
  return template.replace(_format2Regexp, (match, group) => values[group] ?? match);
}
__name(format22, "format2");
function htmlAttributeEncodeValue(value) {
  return value.replace(/[<>"'&]/g, (ch) => {
    switch (ch) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&apos;";
      case "&":
        return "&amp;";
    }
    return ch;
  });
}
__name(htmlAttributeEncodeValue, "htmlAttributeEncodeValue");
function escape(html) {
  return html.replace(/[<>&]/g, function(match) {
    switch (match) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      default:
        return match;
    }
  });
}
__name(escape, "escape");
function escapeRegExpCharacters(value) {
  return value.replace(/[\\\{\}\*\+\?\|\^\$\.\[\]\(\)]/g, "\\$&");
}
__name(escapeRegExpCharacters, "escapeRegExpCharacters");
function count(value, substr) {
  let result = 0;
  let index2 = value.indexOf(substr);
  while (index2 !== -1) {
    result++;
    index2 = value.indexOf(substr, index2 + substr.length);
  }
  return result;
}
__name(count, "count");
function truncate(value, maxLength, suffix = Ellipsis) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.substr(0, maxLength)}${suffix}`;
}
__name(truncate, "truncate");
function truncateMiddle(value, maxLength, suffix = Ellipsis) {
  if (value.length <= maxLength) {
    return value;
  }
  const prefixLength = Math.ceil(maxLength / 2) - suffix.length / 2;
  const suffixLength = Math.floor(maxLength / 2) - suffix.length / 2;
  return `${value.substr(0, prefixLength)}${suffix}${value.substr(value.length - suffixLength)}`;
}
__name(truncateMiddle, "truncateMiddle");
function trim(haystack, needle = " ") {
  const trimmed = ltrim(haystack, needle);
  return rtrim(trimmed, needle);
}
__name(trim, "trim");
function ltrim(haystack, needle) {
  if (!haystack || !needle) {
    return haystack;
  }
  const needleLen = needle.length;
  let offset = 0;
  if (needleLen === 1) {
    const ch = needle.charCodeAt(0);
    while (offset < haystack.length && haystack.charCodeAt(offset) === ch) {
      offset++;
    }
  } else {
    while (haystack.startsWith(needle, offset)) {
      offset += needleLen;
    }
  }
  return haystack.substring(offset);
}
__name(ltrim, "ltrim");
function rtrim(haystack, needle) {
  if (!haystack || !needle) {
    return haystack;
  }
  const needleLen = needle.length, haystackLen = haystack.length;
  if (needleLen === 1) {
    let end = haystackLen;
    const ch = needle.charCodeAt(0);
    while (end > 0 && haystack.charCodeAt(end - 1) === ch) {
      end--;
    }
    return haystack.substring(0, end);
  }
  let offset = haystackLen;
  while (offset > 0 && haystack.endsWith(needle, offset)) {
    offset -= needleLen;
  }
  return haystack.substring(0, offset);
}
__name(rtrim, "rtrim");
function convertSimple2RegExpPattern(pattern) {
  return pattern.replace(/[\-\\\{\}\+\?\|\^\$\.\,\[\]\(\)\#\s]/g, "\\$&").replace(/[\*]/g, ".*");
}
__name(convertSimple2RegExpPattern, "convertSimple2RegExpPattern");
function createRegExp(searchString, isRegex, options = {}) {
  if (!searchString) {
    throw new Error("Cannot create regex from empty string");
  }
  if (!isRegex) {
    searchString = escapeRegExpCharacters(searchString);
  }
  if (options.wholeWord) {
    if (!/\B/.test(searchString.charAt(0))) {
      searchString = "\\b" + searchString;
    }
    if (!/\B/.test(searchString.charAt(searchString.length - 1))) {
      searchString = searchString + "\\b";
    }
  }
  let modifiers = "";
  if (options.global) {
    modifiers += "g";
  }
  if (!options.matchCase) {
    modifiers += "i";
  }
  if (options.multiline) {
    modifiers += "m";
  }
  if (options.unicode) {
    modifiers += "u";
  }
  return new RegExp(searchString, modifiers);
}
__name(createRegExp, "createRegExp");
function regExpLeadsToEndlessLoop(regexp) {
  if (regexp.source === "^" || regexp.source === "^$" || regexp.source === "$" || regexp.source === "^\\s*$") {
    return false;
  }
  const match = regexp.exec("");
  return !!(match && regexp.lastIndex === 0);
}
__name(regExpLeadsToEndlessLoop, "regExpLeadsToEndlessLoop");
function joinStrings(items, separator) {
  return items.filter((item) => item !== void 0 && item !== null && item !== false).join(separator);
}
__name(joinStrings, "joinStrings");
function splitLines(str) {
  return str.split(/\r\n|\r|\n/);
}
__name(splitLines, "splitLines");
function splitLinesIncludeSeparators(str) {
  const linesWithSeparators = [];
  const splitLinesAndSeparators = str.split(/(\r\n|\r|\n)/);
  for (let i = 0; i < Math.ceil(splitLinesAndSeparators.length / 2); i++) {
    linesWithSeparators.push(splitLinesAndSeparators[2 * i] + (splitLinesAndSeparators[2 * i + 1] ?? ""));
  }
  return linesWithSeparators;
}
__name(splitLinesIncludeSeparators, "splitLinesIncludeSeparators");
function indexOfPattern(str, re) {
  const match = re.exec(str);
  if (match) {
    return match.index;
  }
  return -1;
}
__name(indexOfPattern, "indexOfPattern");
function firstNonWhitespaceIndex(str) {
  for (let i = 0, len = str.length; i < len; i++) {
    const chCode = str.charCodeAt(i);
    if (chCode !== 32 && chCode !== 9) {
      return i;
    }
  }
  return -1;
}
__name(firstNonWhitespaceIndex, "firstNonWhitespaceIndex");
function getLeadingWhitespace(str, start = 0, end = str.length) {
  for (let i = start; i < end; i++) {
    const chCode = str.charCodeAt(i);
    if (chCode !== 32 && chCode !== 9) {
      return str.substring(start, i);
    }
  }
  return str.substring(start, end);
}
__name(getLeadingWhitespace, "getLeadingWhitespace");
function lastNonWhitespaceIndex(str, startIndex = str.length - 1) {
  for (let i = startIndex; i >= 0; i--) {
    const chCode = str.charCodeAt(i);
    if (chCode !== 32 && chCode !== 9) {
      return i;
    }
  }
  return -1;
}
__name(lastNonWhitespaceIndex, "lastNonWhitespaceIndex");
function getIndentationLength(str) {
  const idx = firstNonWhitespaceIndex(str);
  if (idx === -1) {
    return str.length;
  }
  return idx;
}
__name(getIndentationLength, "getIndentationLength");
function replaceAsync(str, search, replacer) {
  const parts = [];
  let last = 0;
  for (const match of str.matchAll(search)) {
    parts.push(str.slice(last, match.index));
    if (match.index === void 0) {
      throw new Error("match.index should be defined");
    }
    last = match.index + match[0].length;
    parts.push(replacer(match[0], ...match.slice(1), match.index, str, match.groups));
  }
  parts.push(str.slice(last));
  return Promise.all(parts).then((p) => p.join(""));
}
__name(replaceAsync, "replaceAsync");
function compare(a, b) {
  if (a < b) {
    return -1;
  } else if (a > b) {
    return 1;
  } else {
    return 0;
  }
}
__name(compare, "compare");
function compareSubstring(a, b, aStart = 0, aEnd = a.length, bStart = 0, bEnd = b.length) {
  for (; aStart < aEnd && bStart < bEnd; aStart++, bStart++) {
    const codeA = a.charCodeAt(aStart);
    const codeB = b.charCodeAt(bStart);
    if (codeA < codeB) {
      return -1;
    } else if (codeA > codeB) {
      return 1;
    }
  }
  const aLen = aEnd - aStart;
  const bLen = bEnd - bStart;
  if (aLen < bLen) {
    return -1;
  } else if (aLen > bLen) {
    return 1;
  }
  return 0;
}
__name(compareSubstring, "compareSubstring");
function compareIgnoreCase(a, b) {
  return compareSubstringIgnoreCase(a, b, 0, a.length, 0, b.length);
}
__name(compareIgnoreCase, "compareIgnoreCase");
function compareSubstringIgnoreCase(a, b, aStart = 0, aEnd = a.length, bStart = 0, bEnd = b.length) {
  for (; aStart < aEnd && bStart < bEnd; aStart++, bStart++) {
    let codeA = a.charCodeAt(aStart);
    let codeB = b.charCodeAt(bStart);
    if (codeA === codeB) {
      continue;
    }
    if (codeA >= 128 || codeB >= 128) {
      return compareSubstring(a.toLowerCase(), b.toLowerCase(), aStart, aEnd, bStart, bEnd);
    }
    if (isLowerAsciiLetter(codeA)) {
      codeA -= 32;
    }
    if (isLowerAsciiLetter(codeB)) {
      codeB -= 32;
    }
    const diff = codeA - codeB;
    if (diff === 0) {
      continue;
    }
    return diff;
  }
  const aLen = aEnd - aStart;
  const bLen = bEnd - bStart;
  if (aLen < bLen) {
    return -1;
  } else if (aLen > bLen) {
    return 1;
  }
  return 0;
}
__name(compareSubstringIgnoreCase, "compareSubstringIgnoreCase");
function isAsciiDigit(code) {
  return code >= 48 && code <= 57;
}
__name(isAsciiDigit, "isAsciiDigit");
function isLowerAsciiLetter(code) {
  return code >= 97 && code <= 122;
}
__name(isLowerAsciiLetter, "isLowerAsciiLetter");
function isUpperAsciiLetter(code) {
  return code >= 65 && code <= 90;
}
__name(isUpperAsciiLetter, "isUpperAsciiLetter");
function equalsIgnoreCase(a, b) {
  return a.length === b.length && compareSubstringIgnoreCase(a, b) === 0;
}
__name(equalsIgnoreCase, "equalsIgnoreCase");
function equals2(a, b, ignoreCase) {
  return a === b || !!ignoreCase && a !== void 0 && b !== void 0 && equalsIgnoreCase(a, b);
}
__name(equals2, "equals");
function startsWithIgnoreCase(str, candidate) {
  const len = candidate.length;
  return len <= str.length && compareSubstringIgnoreCase(str, candidate, 0, len) === 0;
}
__name(startsWithIgnoreCase, "startsWithIgnoreCase");
function endsWithIgnoreCase(str, candidate) {
  const len = str.length;
  const start = len - candidate.length;
  return start >= 0 && compareSubstringIgnoreCase(str, candidate, start, len) === 0;
}
__name(endsWithIgnoreCase, "endsWithIgnoreCase");
function commonPrefixLength2(a, b) {
  const len = Math.min(a.length, b.length);
  let i;
  for (i = 0; i < len; i++) {
    if (a.charCodeAt(i) !== b.charCodeAt(i)) {
      return i;
    }
  }
  return len;
}
__name(commonPrefixLength2, "commonPrefixLength");
function commonSuffixLength(a, b) {
  const len = Math.min(a.length, b.length);
  let i;
  const aLastIndex = a.length - 1;
  const bLastIndex = b.length - 1;
  for (i = 0; i < len; i++) {
    if (a.charCodeAt(aLastIndex - i) !== b.charCodeAt(bLastIndex - i)) {
      return i;
    }
  }
  return len;
}
__name(commonSuffixLength, "commonSuffixLength");
function isHighSurrogate(charCode) {
  return 55296 <= charCode && charCode <= 56319;
}
__name(isHighSurrogate, "isHighSurrogate");
function isLowSurrogate(charCode) {
  return 56320 <= charCode && charCode <= 57343;
}
__name(isLowSurrogate, "isLowSurrogate");
function computeCodePoint(highSurrogate, lowSurrogate) {
  return (highSurrogate - 55296 << 10) + (lowSurrogate - 56320) + 65536;
}
__name(computeCodePoint, "computeCodePoint");
function getNextCodePoint(str, len, offset) {
  const charCode = str.charCodeAt(offset);
  if (isHighSurrogate(charCode) && offset + 1 < len) {
    const nextCharCode = str.charCodeAt(offset + 1);
    if (isLowSurrogate(nextCharCode)) {
      return computeCodePoint(charCode, nextCharCode);
    }
  }
  return charCode;
}
__name(getNextCodePoint, "getNextCodePoint");
function getPrevCodePoint(str, offset) {
  const charCode = str.charCodeAt(offset - 1);
  if (isLowSurrogate(charCode) && offset > 1) {
    const prevCharCode = str.charCodeAt(offset - 2);
    if (isHighSurrogate(prevCharCode)) {
      return computeCodePoint(prevCharCode, charCode);
    }
  }
  return charCode;
}
__name(getPrevCodePoint, "getPrevCodePoint");
var CodePointIterator = class {
  static {
    __name(this, "CodePointIterator");
  }
  get offset() {
    return this._offset;
  }
  constructor(str, offset = 0) {
    this._str = str;
    this._len = str.length;
    this._offset = offset;
  }
  setOffset(offset) {
    this._offset = offset;
  }
  prevCodePoint() {
    const codePoint = getPrevCodePoint(this._str, this._offset);
    this._offset -= codePoint >= 65536 ? 2 : 1;
    return codePoint;
  }
  nextCodePoint() {
    const codePoint = getNextCodePoint(this._str, this._len, this._offset);
    this._offset += codePoint >= 65536 ? 2 : 1;
    return codePoint;
  }
  eol() {
    return this._offset >= this._len;
  }
};
var GraphemeIterator = class {
  static {
    __name(this, "GraphemeIterator");
  }
  get offset() {
    return this._iterator.offset;
  }
  constructor(str, offset = 0) {
    this._iterator = new CodePointIterator(str, offset);
  }
  nextGraphemeLength() {
    const graphemeBreakTree = GraphemeBreakTree.getInstance();
    const iterator = this._iterator;
    const initialOffset = iterator.offset;
    let graphemeBreakType = graphemeBreakTree.getGraphemeBreakType(iterator.nextCodePoint());
    while (!iterator.eol()) {
      const offset = iterator.offset;
      const nextGraphemeBreakType = graphemeBreakTree.getGraphemeBreakType(iterator.nextCodePoint());
      if (breakBetweenGraphemeBreakType(graphemeBreakType, nextGraphemeBreakType)) {
        iterator.setOffset(offset);
        break;
      }
      graphemeBreakType = nextGraphemeBreakType;
    }
    return iterator.offset - initialOffset;
  }
  prevGraphemeLength() {
    const graphemeBreakTree = GraphemeBreakTree.getInstance();
    const iterator = this._iterator;
    const initialOffset = iterator.offset;
    let graphemeBreakType = graphemeBreakTree.getGraphemeBreakType(iterator.prevCodePoint());
    while (iterator.offset > 0) {
      const offset = iterator.offset;
      const prevGraphemeBreakType = graphemeBreakTree.getGraphemeBreakType(iterator.prevCodePoint());
      if (breakBetweenGraphemeBreakType(prevGraphemeBreakType, graphemeBreakType)) {
        iterator.setOffset(offset);
        break;
      }
      graphemeBreakType = prevGraphemeBreakType;
    }
    return initialOffset - iterator.offset;
  }
  eol() {
    return this._iterator.eol();
  }
};
function nextCharLength(str, initialOffset) {
  const iterator = new GraphemeIterator(str, initialOffset);
  return iterator.nextGraphemeLength();
}
__name(nextCharLength, "nextCharLength");
function prevCharLength(str, initialOffset) {
  const iterator = new GraphemeIterator(str, initialOffset);
  return iterator.prevGraphemeLength();
}
__name(prevCharLength, "prevCharLength");
function getCharContainingOffset(str, offset) {
  if (offset > 0 && isLowSurrogate(str.charCodeAt(offset))) {
    offset--;
  }
  const endOffset = offset + nextCharLength(str, offset);
  const startOffset = endOffset - prevCharLength(str, endOffset);
  return [startOffset, endOffset];
}
__name(getCharContainingOffset, "getCharContainingOffset");
function charCount(str) {
  const iterator = new GraphemeIterator(str);
  let length = 0;
  while (!iterator.eol()) {
    length++;
    iterator.nextGraphemeLength();
  }
  return length;
}
__name(charCount, "charCount");
var CONTAINS_RTL = void 0;
function makeContainsRtl() {
  return /(?:[\u05BE\u05C0\u05C3\u05C6\u05D0-\u05F4\u0608\u060B\u060D\u061B-\u064A\u066D-\u066F\u0671-\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u0710\u0712-\u072F\u074D-\u07A5\u07B1-\u07EA\u07F4\u07F5\u07FA\u07FE-\u0815\u081A\u0824\u0828\u0830-\u0858\u085E-\u088E\u08A0-\u08C9\u200F\uFB1D\uFB1F-\uFB28\uFB2A-\uFD3D\uFD50-\uFDC7\uFDF0-\uFDFC\uFE70-\uFEFC]|\uD802[\uDC00-\uDD1B\uDD20-\uDE00\uDE10-\uDE35\uDE40-\uDEE4\uDEEB-\uDF35\uDF40-\uDFFF]|\uD803[\uDC00-\uDD23\uDE80-\uDEA9\uDEAD-\uDF45\uDF51-\uDF81\uDF86-\uDFF6]|\uD83A[\uDC00-\uDCCF\uDD00-\uDD43\uDD4B-\uDFFF]|\uD83B[\uDC00-\uDEBB])/;
}
__name(makeContainsRtl, "makeContainsRtl");
function containsRTL(str) {
  if (!CONTAINS_RTL) {
    CONTAINS_RTL = makeContainsRtl();
  }
  return CONTAINS_RTL.test(str);
}
__name(containsRTL, "containsRTL");
var IS_BASIC_ASCII = /^[\t\n\r\x20-\x7E]*$/;
function isBasicASCII(str) {
  return IS_BASIC_ASCII.test(str);
}
__name(isBasicASCII, "isBasicASCII");
var UNUSUAL_LINE_TERMINATORS = /[\u2028\u2029]/;
function containsUnusualLineTerminators(str) {
  return UNUSUAL_LINE_TERMINATORS.test(str);
}
__name(containsUnusualLineTerminators, "containsUnusualLineTerminators");
function isFullWidthCharacter(charCode) {
  return charCode >= 11904 && charCode <= 55215 || charCode >= 63744 && charCode <= 64255 || charCode >= 65281 && charCode <= 65374 || charCode >= 65504 && charCode <= 65510;
}
__name(isFullWidthCharacter, "isFullWidthCharacter");
function isEmojiImprecise(x) {
  return x >= 127462 && x <= 127487 || x === 8986 || x === 8987 || x === 9200 || x === 9203 || x >= 9728 && x <= 10175 || x === 11088 || x === 11093 || x >= 127744 && x <= 128591 || x >= 128640 && x <= 128764 || x >= 128992 && x <= 129008 || x >= 129280 && x <= 129535 || x >= 129648 && x <= 129782;
}
__name(isEmojiImprecise, "isEmojiImprecise");
function lcut(text, n, prefix = "") {
  const trimmed = text.trimStart();
  if (trimmed.length < n) {
    return trimmed;
  }
  const re = /\b/g;
  let i = 0;
  while (re.test(trimmed)) {
    if (trimmed.length - re.lastIndex < n) {
      break;
    }
    i = re.lastIndex;
    re.lastIndex += 1;
  }
  if (i === 0) {
    return trimmed;
  }
  return prefix + trimmed.substring(i).trimStart();
}
__name(lcut, "lcut");
function rcut(text, n, suffix = "") {
  const trimmed = text.trimEnd();
  if (trimmed.length <= n) {
    return trimmed;
  }
  const re = /\b/g;
  let lastGoodBreak = 0;
  let foundBoundaryAfterN = false;
  while (re.test(trimmed)) {
    if (re.lastIndex > n) {
      foundBoundaryAfterN = true;
      break;
    }
    lastGoodBreak = re.lastIndex;
    re.lastIndex += 1;
  }
  if (!foundBoundaryAfterN) {
    return trimmed;
  }
  if (lastGoodBreak === 0) {
    return suffix;
  }
  const result = trimmed.substring(0, lastGoodBreak).trimEnd();
  if (result.length < lastGoodBreak / 2) {
    return trimmed;
  }
  return result + suffix;
}
__name(rcut, "rcut");
var CSI_SEQUENCE = /(?:\x1b\[|\x9b)[=?>!]?[\d;:]*["$#'* ]?[a-zA-Z@^`{}|~]/;
var OSC_SEQUENCE = /(?:\x1b\]|\x9d).*?(?:\x1b\\|\x07|\x9c)/;
var ESC_SEQUENCE = /\x1b(?:[ #%\(\)\*\+\-\.\/]?[a-zA-Z0-9\|}~@])/;
var CONTROL_SEQUENCES = new RegExp("(?:" + [
  CSI_SEQUENCE.source,
  OSC_SEQUENCE.source,
  ESC_SEQUENCE.source
].join("|") + ")", "g");
function* forAnsiStringParts(str) {
  let last = 0;
  for (const match of str.matchAll(CONTROL_SEQUENCES)) {
    if (last !== match.index) {
      yield { isCode: false, str: str.substring(last, match.index) };
    }
    yield { isCode: true, str: match[0] };
    last = match.index + match[0].length;
  }
  if (last !== str.length) {
    yield { isCode: false, str: str.substring(last) };
  }
}
__name(forAnsiStringParts, "forAnsiStringParts");
function removeAnsiEscapeCodes(str) {
  if (str) {
    str = str.replace(CONTROL_SEQUENCES, "");
  }
  return str;
}
__name(removeAnsiEscapeCodes, "removeAnsiEscapeCodes");
var PROMPT_NON_PRINTABLE = /\\\[.*?\\\]/g;
function removeAnsiEscapeCodesFromPrompt(str) {
  return removeAnsiEscapeCodes(str).replace(PROMPT_NON_PRINTABLE, "");
}
__name(removeAnsiEscapeCodesFromPrompt, "removeAnsiEscapeCodesFromPrompt");
var UTF8_BOM_CHARACTER = String.fromCharCode(
  65279
  /* CharCode.UTF8_BOM */
);
function startsWithUTF8BOM(str) {
  return !!(str && str.length > 0 && str.charCodeAt(0) === 65279);
}
__name(startsWithUTF8BOM, "startsWithUTF8BOM");
function stripUTF8BOM(str) {
  return startsWithUTF8BOM(str) ? str.substr(1) : str;
}
__name(stripUTF8BOM, "stripUTF8BOM");
function fuzzyContains(target, query) {
  if (!target || !query) {
    return false;
  }
  if (target.length < query.length) {
    return false;
  }
  const queryLen = query.length;
  const targetLower = target.toLowerCase();
  let index2 = 0;
  let lastIndexOf = -1;
  while (index2 < queryLen) {
    const indexOf = targetLower.indexOf(query[index2], lastIndexOf + 1);
    if (indexOf < 0) {
      return false;
    }
    lastIndexOf = indexOf;
    index2++;
  }
  return true;
}
__name(fuzzyContains, "fuzzyContains");
function containsUppercaseCharacter(target, ignoreEscapedChars = false) {
  if (!target) {
    return false;
  }
  if (ignoreEscapedChars) {
    target = target.replace(/\\./g, "");
  }
  return target.toLowerCase() !== target;
}
__name(containsUppercaseCharacter, "containsUppercaseCharacter");
function uppercaseFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
__name(uppercaseFirstLetter, "uppercaseFirstLetter");
function getNLines(str, n = 1) {
  if (n === 0) {
    return "";
  }
  let idx = -1;
  do {
    idx = str.indexOf("\n", idx + 1);
    n--;
  } while (n > 0 && idx >= 0);
  if (idx === -1) {
    return str;
  }
  if (str[idx - 1] === "\r") {
    idx--;
  }
  return str.substr(0, idx);
}
__name(getNLines, "getNLines");
function singleLetterHash(n) {
  const LETTERS_CNT = 90 - 65 + 1;
  n = n % (2 * LETTERS_CNT);
  if (n < LETTERS_CNT) {
    return String.fromCharCode(97 + n);
  }
  return String.fromCharCode(65 + n - LETTERS_CNT);
}
__name(singleLetterHash, "singleLetterHash");
function getGraphemeBreakType(codePoint) {
  const graphemeBreakTree = GraphemeBreakTree.getInstance();
  return graphemeBreakTree.getGraphemeBreakType(codePoint);
}
__name(getGraphemeBreakType, "getGraphemeBreakType");
function breakBetweenGraphemeBreakType(breakTypeA, breakTypeB) {
  if (breakTypeA === 0) {
    return breakTypeB !== 5 && breakTypeB !== 7;
  }
  if (breakTypeA === 2) {
    if (breakTypeB === 3) {
      return false;
    }
  }
  if (breakTypeA === 4 || breakTypeA === 2 || breakTypeA === 3) {
    return true;
  }
  if (breakTypeB === 4 || breakTypeB === 2 || breakTypeB === 3) {
    return true;
  }
  if (breakTypeA === 8) {
    if (breakTypeB === 8 || breakTypeB === 9 || breakTypeB === 11 || breakTypeB === 12) {
      return false;
    }
  }
  if (breakTypeA === 11 || breakTypeA === 9) {
    if (breakTypeB === 9 || breakTypeB === 10) {
      return false;
    }
  }
  if (breakTypeA === 12 || breakTypeA === 10) {
    if (breakTypeB === 10) {
      return false;
    }
  }
  if (breakTypeB === 5 || breakTypeB === 13) {
    return false;
  }
  if (breakTypeB === 7) {
    return false;
  }
  if (breakTypeA === 1) {
    return false;
  }
  if (breakTypeA === 13 && breakTypeB === 14) {
    return false;
  }
  if (breakTypeA === 6 && breakTypeB === 6) {
    return false;
  }
  return true;
}
__name(breakBetweenGraphemeBreakType, "breakBetweenGraphemeBreakType");
var GraphemeBreakType;
(function(GraphemeBreakType2) {
  GraphemeBreakType2[GraphemeBreakType2["Other"] = 0] = "Other";
  GraphemeBreakType2[GraphemeBreakType2["Prepend"] = 1] = "Prepend";
  GraphemeBreakType2[GraphemeBreakType2["CR"] = 2] = "CR";
  GraphemeBreakType2[GraphemeBreakType2["LF"] = 3] = "LF";
  GraphemeBreakType2[GraphemeBreakType2["Control"] = 4] = "Control";
  GraphemeBreakType2[GraphemeBreakType2["Extend"] = 5] = "Extend";
  GraphemeBreakType2[GraphemeBreakType2["Regional_Indicator"] = 6] = "Regional_Indicator";
  GraphemeBreakType2[GraphemeBreakType2["SpacingMark"] = 7] = "SpacingMark";
  GraphemeBreakType2[GraphemeBreakType2["L"] = 8] = "L";
  GraphemeBreakType2[GraphemeBreakType2["V"] = 9] = "V";
  GraphemeBreakType2[GraphemeBreakType2["T"] = 10] = "T";
  GraphemeBreakType2[GraphemeBreakType2["LV"] = 11] = "LV";
  GraphemeBreakType2[GraphemeBreakType2["LVT"] = 12] = "LVT";
  GraphemeBreakType2[GraphemeBreakType2["ZWJ"] = 13] = "ZWJ";
  GraphemeBreakType2[GraphemeBreakType2["Extended_Pictographic"] = 14] = "Extended_Pictographic";
})(GraphemeBreakType || (GraphemeBreakType = {}));
var GraphemeBreakTree = class _GraphemeBreakTree {
  static {
    __name(this, "GraphemeBreakTree");
  }
  static {
    this._INSTANCE = null;
  }
  static getInstance() {
    if (!_GraphemeBreakTree._INSTANCE) {
      _GraphemeBreakTree._INSTANCE = new _GraphemeBreakTree();
    }
    return _GraphemeBreakTree._INSTANCE;
  }
  constructor() {
    this._data = getGraphemeBreakRawData();
  }
  getGraphemeBreakType(codePoint) {
    if (codePoint < 32) {
      if (codePoint === 10) {
        return 3;
      }
      if (codePoint === 13) {
        return 2;
      }
      return 4;
    }
    if (codePoint < 127) {
      return 0;
    }
    const data = this._data;
    const nodeCount = data.length / 3;
    let nodeIndex = 1;
    while (nodeIndex <= nodeCount) {
      if (codePoint < data[3 * nodeIndex]) {
        nodeIndex = 2 * nodeIndex;
      } else if (codePoint > data[3 * nodeIndex + 1]) {
        nodeIndex = 2 * nodeIndex + 1;
      } else {
        return data[3 * nodeIndex + 2];
      }
    }
    return 0;
  }
};
function getGraphemeBreakRawData() {
  return JSON.parse("[0,0,0,51229,51255,12,44061,44087,12,127462,127487,6,7083,7085,5,47645,47671,12,54813,54839,12,128678,128678,14,3270,3270,5,9919,9923,14,45853,45879,12,49437,49463,12,53021,53047,12,71216,71218,7,128398,128399,14,129360,129374,14,2519,2519,5,4448,4519,9,9742,9742,14,12336,12336,14,44957,44983,12,46749,46775,12,48541,48567,12,50333,50359,12,52125,52151,12,53917,53943,12,69888,69890,5,73018,73018,5,127990,127990,14,128558,128559,14,128759,128760,14,129653,129655,14,2027,2035,5,2891,2892,7,3761,3761,5,6683,6683,5,8293,8293,4,9825,9826,14,9999,9999,14,43452,43453,5,44509,44535,12,45405,45431,12,46301,46327,12,47197,47223,12,48093,48119,12,48989,49015,12,49885,49911,12,50781,50807,12,51677,51703,12,52573,52599,12,53469,53495,12,54365,54391,12,65279,65279,4,70471,70472,7,72145,72147,7,119173,119179,5,127799,127818,14,128240,128244,14,128512,128512,14,128652,128652,14,128721,128722,14,129292,129292,14,129445,129450,14,129734,129743,14,1476,1477,5,2366,2368,7,2750,2752,7,3076,3076,5,3415,3415,5,4141,4144,5,6109,6109,5,6964,6964,5,7394,7400,5,9197,9198,14,9770,9770,14,9877,9877,14,9968,9969,14,10084,10084,14,43052,43052,5,43713,43713,5,44285,44311,12,44733,44759,12,45181,45207,12,45629,45655,12,46077,46103,12,46525,46551,12,46973,46999,12,47421,47447,12,47869,47895,12,48317,48343,12,48765,48791,12,49213,49239,12,49661,49687,12,50109,50135,12,50557,50583,12,51005,51031,12,51453,51479,12,51901,51927,12,52349,52375,12,52797,52823,12,53245,53271,12,53693,53719,12,54141,54167,12,54589,54615,12,55037,55063,12,69506,69509,5,70191,70193,5,70841,70841,7,71463,71467,5,72330,72342,5,94031,94031,5,123628,123631,5,127763,127765,14,127941,127941,14,128043,128062,14,128302,128317,14,128465,128467,14,128539,128539,14,128640,128640,14,128662,128662,14,128703,128703,14,128745,128745,14,129004,129007,14,129329,129330,14,129402,129402,14,129483,129483,14,129686,129704,14,130048,131069,14,173,173,4,1757,1757,1,2200,2207,5,2434,2435,7,2631,2632,5,2817,2817,5,3008,3008,5,3201,3201,5,3387,3388,5,3542,3542,5,3902,3903,7,4190,4192,5,6002,6003,5,6439,6440,5,6765,6770,7,7019,7027,5,7154,7155,7,8205,8205,13,8505,8505,14,9654,9654,14,9757,9757,14,9792,9792,14,9852,9853,14,9890,9894,14,9937,9937,14,9981,9981,14,10035,10036,14,11035,11036,14,42654,42655,5,43346,43347,7,43587,43587,5,44006,44007,7,44173,44199,12,44397,44423,12,44621,44647,12,44845,44871,12,45069,45095,12,45293,45319,12,45517,45543,12,45741,45767,12,45965,45991,12,46189,46215,12,46413,46439,12,46637,46663,12,46861,46887,12,47085,47111,12,47309,47335,12,47533,47559,12,47757,47783,12,47981,48007,12,48205,48231,12,48429,48455,12,48653,48679,12,48877,48903,12,49101,49127,12,49325,49351,12,49549,49575,12,49773,49799,12,49997,50023,12,50221,50247,12,50445,50471,12,50669,50695,12,50893,50919,12,51117,51143,12,51341,51367,12,51565,51591,12,51789,51815,12,52013,52039,12,52237,52263,12,52461,52487,12,52685,52711,12,52909,52935,12,53133,53159,12,53357,53383,12,53581,53607,12,53805,53831,12,54029,54055,12,54253,54279,12,54477,54503,12,54701,54727,12,54925,54951,12,55149,55175,12,68101,68102,5,69762,69762,7,70067,70069,7,70371,70378,5,70720,70721,7,71087,71087,5,71341,71341,5,71995,71996,5,72249,72249,7,72850,72871,5,73109,73109,5,118576,118598,5,121505,121519,5,127245,127247,14,127568,127569,14,127777,127777,14,127872,127891,14,127956,127967,14,128015,128016,14,128110,128172,14,128259,128259,14,128367,128368,14,128424,128424,14,128488,128488,14,128530,128532,14,128550,128551,14,128566,128566,14,128647,128647,14,128656,128656,14,128667,128673,14,128691,128693,14,128715,128715,14,128728,128732,14,128752,128752,14,128765,128767,14,129096,129103,14,129311,129311,14,129344,129349,14,129394,129394,14,129413,129425,14,129466,129471,14,129511,129535,14,129664,129666,14,129719,129722,14,129760,129767,14,917536,917631,5,13,13,2,1160,1161,5,1564,1564,4,1807,1807,1,2085,2087,5,2307,2307,7,2382,2383,7,2497,2500,5,2563,2563,7,2677,2677,5,2763,2764,7,2879,2879,5,2914,2915,5,3021,3021,5,3142,3144,5,3263,3263,5,3285,3286,5,3398,3400,7,3530,3530,5,3633,3633,5,3864,3865,5,3974,3975,5,4155,4156,7,4229,4230,5,5909,5909,7,6078,6085,7,6277,6278,5,6451,6456,7,6744,6750,5,6846,6846,5,6972,6972,5,7074,7077,5,7146,7148,7,7222,7223,5,7416,7417,5,8234,8238,4,8417,8417,5,9000,9000,14,9203,9203,14,9730,9731,14,9748,9749,14,9762,9763,14,9776,9783,14,9800,9811,14,9831,9831,14,9872,9873,14,9882,9882,14,9900,9903,14,9929,9933,14,9941,9960,14,9974,9974,14,9989,9989,14,10006,10006,14,10062,10062,14,10160,10160,14,11647,11647,5,12953,12953,14,43019,43019,5,43232,43249,5,43443,43443,5,43567,43568,7,43696,43696,5,43765,43765,7,44013,44013,5,44117,44143,12,44229,44255,12,44341,44367,12,44453,44479,12,44565,44591,12,44677,44703,12,44789,44815,12,44901,44927,12,45013,45039,12,45125,45151,12,45237,45263,12,45349,45375,12,45461,45487,12,45573,45599,12,45685,45711,12,45797,45823,12,45909,45935,12,46021,46047,12,46133,46159,12,46245,46271,12,46357,46383,12,46469,46495,12,46581,46607,12,46693,46719,12,46805,46831,12,46917,46943,12,47029,47055,12,47141,47167,12,47253,47279,12,47365,47391,12,47477,47503,12,47589,47615,12,47701,47727,12,47813,47839,12,47925,47951,12,48037,48063,12,48149,48175,12,48261,48287,12,48373,48399,12,48485,48511,12,48597,48623,12,48709,48735,12,48821,48847,12,48933,48959,12,49045,49071,12,49157,49183,12,49269,49295,12,49381,49407,12,49493,49519,12,49605,49631,12,49717,49743,12,49829,49855,12,49941,49967,12,50053,50079,12,50165,50191,12,50277,50303,12,50389,50415,12,50501,50527,12,50613,50639,12,50725,50751,12,50837,50863,12,50949,50975,12,51061,51087,12,51173,51199,12,51285,51311,12,51397,51423,12,51509,51535,12,51621,51647,12,51733,51759,12,51845,51871,12,51957,51983,12,52069,52095,12,52181,52207,12,52293,52319,12,52405,52431,12,52517,52543,12,52629,52655,12,52741,52767,12,52853,52879,12,52965,52991,12,53077,53103,12,53189,53215,12,53301,53327,12,53413,53439,12,53525,53551,12,53637,53663,12,53749,53775,12,53861,53887,12,53973,53999,12,54085,54111,12,54197,54223,12,54309,54335,12,54421,54447,12,54533,54559,12,54645,54671,12,54757,54783,12,54869,54895,12,54981,55007,12,55093,55119,12,55243,55291,10,66045,66045,5,68325,68326,5,69688,69702,5,69817,69818,5,69957,69958,7,70089,70092,5,70198,70199,5,70462,70462,5,70502,70508,5,70750,70750,5,70846,70846,7,71100,71101,5,71230,71230,7,71351,71351,5,71737,71738,5,72000,72000,7,72160,72160,5,72273,72278,5,72752,72758,5,72882,72883,5,73031,73031,5,73461,73462,7,94192,94193,7,119149,119149,7,121403,121452,5,122915,122916,5,126980,126980,14,127358,127359,14,127535,127535,14,127759,127759,14,127771,127771,14,127792,127793,14,127825,127867,14,127897,127899,14,127945,127945,14,127985,127986,14,128000,128007,14,128021,128021,14,128066,128100,14,128184,128235,14,128249,128252,14,128266,128276,14,128335,128335,14,128379,128390,14,128407,128419,14,128444,128444,14,128481,128481,14,128499,128499,14,128526,128526,14,128536,128536,14,128543,128543,14,128556,128556,14,128564,128564,14,128577,128580,14,128643,128645,14,128649,128649,14,128654,128654,14,128660,128660,14,128664,128664,14,128675,128675,14,128686,128689,14,128695,128696,14,128705,128709,14,128717,128719,14,128725,128725,14,128736,128741,14,128747,128748,14,128755,128755,14,128762,128762,14,128981,128991,14,129009,129023,14,129160,129167,14,129296,129304,14,129320,129327,14,129340,129342,14,129356,129356,14,129388,129392,14,129399,129400,14,129404,129407,14,129432,129442,14,129454,129455,14,129473,129474,14,129485,129487,14,129648,129651,14,129659,129660,14,129671,129679,14,129709,129711,14,129728,129730,14,129751,129753,14,129776,129782,14,917505,917505,4,917760,917999,5,10,10,3,127,159,4,768,879,5,1471,1471,5,1536,1541,1,1648,1648,5,1767,1768,5,1840,1866,5,2070,2073,5,2137,2139,5,2274,2274,1,2363,2363,7,2377,2380,7,2402,2403,5,2494,2494,5,2507,2508,7,2558,2558,5,2622,2624,7,2641,2641,5,2691,2691,7,2759,2760,5,2786,2787,5,2876,2876,5,2881,2884,5,2901,2902,5,3006,3006,5,3014,3016,7,3072,3072,5,3134,3136,5,3157,3158,5,3260,3260,5,3266,3266,5,3274,3275,7,3328,3329,5,3391,3392,7,3405,3405,5,3457,3457,5,3536,3537,7,3551,3551,5,3636,3642,5,3764,3772,5,3895,3895,5,3967,3967,7,3993,4028,5,4146,4151,5,4182,4183,7,4226,4226,5,4253,4253,5,4957,4959,5,5940,5940,7,6070,6070,7,6087,6088,7,6158,6158,4,6432,6434,5,6448,6449,7,6679,6680,5,6742,6742,5,6754,6754,5,6783,6783,5,6912,6915,5,6966,6970,5,6978,6978,5,7042,7042,7,7080,7081,5,7143,7143,7,7150,7150,7,7212,7219,5,7380,7392,5,7412,7412,5,8203,8203,4,8232,8232,4,8265,8265,14,8400,8412,5,8421,8432,5,8617,8618,14,9167,9167,14,9200,9200,14,9410,9410,14,9723,9726,14,9733,9733,14,9745,9745,14,9752,9752,14,9760,9760,14,9766,9766,14,9774,9774,14,9786,9786,14,9794,9794,14,9823,9823,14,9828,9828,14,9833,9850,14,9855,9855,14,9875,9875,14,9880,9880,14,9885,9887,14,9896,9897,14,9906,9916,14,9926,9927,14,9935,9935,14,9939,9939,14,9962,9962,14,9972,9972,14,9978,9978,14,9986,9986,14,9997,9997,14,10002,10002,14,10017,10017,14,10055,10055,14,10071,10071,14,10133,10135,14,10548,10549,14,11093,11093,14,12330,12333,5,12441,12442,5,42608,42610,5,43010,43010,5,43045,43046,5,43188,43203,7,43302,43309,5,43392,43394,5,43446,43449,5,43493,43493,5,43571,43572,7,43597,43597,7,43703,43704,5,43756,43757,5,44003,44004,7,44009,44010,7,44033,44059,12,44089,44115,12,44145,44171,12,44201,44227,12,44257,44283,12,44313,44339,12,44369,44395,12,44425,44451,12,44481,44507,12,44537,44563,12,44593,44619,12,44649,44675,12,44705,44731,12,44761,44787,12,44817,44843,12,44873,44899,12,44929,44955,12,44985,45011,12,45041,45067,12,45097,45123,12,45153,45179,12,45209,45235,12,45265,45291,12,45321,45347,12,45377,45403,12,45433,45459,12,45489,45515,12,45545,45571,12,45601,45627,12,45657,45683,12,45713,45739,12,45769,45795,12,45825,45851,12,45881,45907,12,45937,45963,12,45993,46019,12,46049,46075,12,46105,46131,12,46161,46187,12,46217,46243,12,46273,46299,12,46329,46355,12,46385,46411,12,46441,46467,12,46497,46523,12,46553,46579,12,46609,46635,12,46665,46691,12,46721,46747,12,46777,46803,12,46833,46859,12,46889,46915,12,46945,46971,12,47001,47027,12,47057,47083,12,47113,47139,12,47169,47195,12,47225,47251,12,47281,47307,12,47337,47363,12,47393,47419,12,47449,47475,12,47505,47531,12,47561,47587,12,47617,47643,12,47673,47699,12,47729,47755,12,47785,47811,12,47841,47867,12,47897,47923,12,47953,47979,12,48009,48035,12,48065,48091,12,48121,48147,12,48177,48203,12,48233,48259,12,48289,48315,12,48345,48371,12,48401,48427,12,48457,48483,12,48513,48539,12,48569,48595,12,48625,48651,12,48681,48707,12,48737,48763,12,48793,48819,12,48849,48875,12,48905,48931,12,48961,48987,12,49017,49043,12,49073,49099,12,49129,49155,12,49185,49211,12,49241,49267,12,49297,49323,12,49353,49379,12,49409,49435,12,49465,49491,12,49521,49547,12,49577,49603,12,49633,49659,12,49689,49715,12,49745,49771,12,49801,49827,12,49857,49883,12,49913,49939,12,49969,49995,12,50025,50051,12,50081,50107,12,50137,50163,12,50193,50219,12,50249,50275,12,50305,50331,12,50361,50387,12,50417,50443,12,50473,50499,12,50529,50555,12,50585,50611,12,50641,50667,12,50697,50723,12,50753,50779,12,50809,50835,12,50865,50891,12,50921,50947,12,50977,51003,12,51033,51059,12,51089,51115,12,51145,51171,12,51201,51227,12,51257,51283,12,51313,51339,12,51369,51395,12,51425,51451,12,51481,51507,12,51537,51563,12,51593,51619,12,51649,51675,12,51705,51731,12,51761,51787,12,51817,51843,12,51873,51899,12,51929,51955,12,51985,52011,12,52041,52067,12,52097,52123,12,52153,52179,12,52209,52235,12,52265,52291,12,52321,52347,12,52377,52403,12,52433,52459,12,52489,52515,12,52545,52571,12,52601,52627,12,52657,52683,12,52713,52739,12,52769,52795,12,52825,52851,12,52881,52907,12,52937,52963,12,52993,53019,12,53049,53075,12,53105,53131,12,53161,53187,12,53217,53243,12,53273,53299,12,53329,53355,12,53385,53411,12,53441,53467,12,53497,53523,12,53553,53579,12,53609,53635,12,53665,53691,12,53721,53747,12,53777,53803,12,53833,53859,12,53889,53915,12,53945,53971,12,54001,54027,12,54057,54083,12,54113,54139,12,54169,54195,12,54225,54251,12,54281,54307,12,54337,54363,12,54393,54419,12,54449,54475,12,54505,54531,12,54561,54587,12,54617,54643,12,54673,54699,12,54729,54755,12,54785,54811,12,54841,54867,12,54897,54923,12,54953,54979,12,55009,55035,12,55065,55091,12,55121,55147,12,55177,55203,12,65024,65039,5,65520,65528,4,66422,66426,5,68152,68154,5,69291,69292,5,69633,69633,5,69747,69748,5,69811,69814,5,69826,69826,5,69932,69932,7,70016,70017,5,70079,70080,7,70095,70095,5,70196,70196,5,70367,70367,5,70402,70403,7,70464,70464,5,70487,70487,5,70709,70711,7,70725,70725,7,70833,70834,7,70843,70844,7,70849,70849,7,71090,71093,5,71103,71104,5,71227,71228,7,71339,71339,5,71344,71349,5,71458,71461,5,71727,71735,5,71985,71989,7,71998,71998,5,72002,72002,7,72154,72155,5,72193,72202,5,72251,72254,5,72281,72283,5,72344,72345,5,72766,72766,7,72874,72880,5,72885,72886,5,73023,73029,5,73104,73105,5,73111,73111,5,92912,92916,5,94095,94098,5,113824,113827,4,119142,119142,7,119155,119162,4,119362,119364,5,121476,121476,5,122888,122904,5,123184,123190,5,125252,125258,5,127183,127183,14,127340,127343,14,127377,127386,14,127491,127503,14,127548,127551,14,127744,127756,14,127761,127761,14,127769,127769,14,127773,127774,14,127780,127788,14,127796,127797,14,127820,127823,14,127869,127869,14,127894,127895,14,127902,127903,14,127943,127943,14,127947,127950,14,127972,127972,14,127988,127988,14,127992,127994,14,128009,128011,14,128019,128019,14,128023,128041,14,128064,128064,14,128102,128107,14,128174,128181,14,128238,128238,14,128246,128247,14,128254,128254,14,128264,128264,14,128278,128299,14,128329,128330,14,128348,128359,14,128371,128377,14,128392,128393,14,128401,128404,14,128421,128421,14,128433,128434,14,128450,128452,14,128476,128478,14,128483,128483,14,128495,128495,14,128506,128506,14,128519,128520,14,128528,128528,14,128534,128534,14,128538,128538,14,128540,128542,14,128544,128549,14,128552,128555,14,128557,128557,14,128560,128563,14,128565,128565,14,128567,128576,14,128581,128591,14,128641,128642,14,128646,128646,14,128648,128648,14,128650,128651,14,128653,128653,14,128655,128655,14,128657,128659,14,128661,128661,14,128663,128663,14,128665,128666,14,128674,128674,14,128676,128677,14,128679,128685,14,128690,128690,14,128694,128694,14,128697,128702,14,128704,128704,14,128710,128714,14,128716,128716,14,128720,128720,14,128723,128724,14,128726,128727,14,128733,128735,14,128742,128744,14,128746,128746,14,128749,128751,14,128753,128754,14,128756,128758,14,128761,128761,14,128763,128764,14,128884,128895,14,128992,129003,14,129008,129008,14,129036,129039,14,129114,129119,14,129198,129279,14,129293,129295,14,129305,129310,14,129312,129319,14,129328,129328,14,129331,129338,14,129343,129343,14,129351,129355,14,129357,129359,14,129375,129387,14,129393,129393,14,129395,129398,14,129401,129401,14,129403,129403,14,129408,129412,14,129426,129431,14,129443,129444,14,129451,129453,14,129456,129465,14,129472,129472,14,129475,129482,14,129484,129484,14,129488,129510,14,129536,129647,14,129652,129652,14,129656,129658,14,129661,129663,14,129667,129670,14,129680,129685,14,129705,129708,14,129712,129718,14,129723,129727,14,129731,129733,14,129744,129750,14,129754,129759,14,129768,129775,14,129783,129791,14,917504,917504,4,917506,917535,4,917632,917759,4,918000,921599,4,0,9,4,11,12,4,14,31,4,169,169,14,174,174,14,1155,1159,5,1425,1469,5,1473,1474,5,1479,1479,5,1552,1562,5,1611,1631,5,1750,1756,5,1759,1764,5,1770,1773,5,1809,1809,5,1958,1968,5,2045,2045,5,2075,2083,5,2089,2093,5,2192,2193,1,2250,2273,5,2275,2306,5,2362,2362,5,2364,2364,5,2369,2376,5,2381,2381,5,2385,2391,5,2433,2433,5,2492,2492,5,2495,2496,7,2503,2504,7,2509,2509,5,2530,2531,5,2561,2562,5,2620,2620,5,2625,2626,5,2635,2637,5,2672,2673,5,2689,2690,5,2748,2748,5,2753,2757,5,2761,2761,7,2765,2765,5,2810,2815,5,2818,2819,7,2878,2878,5,2880,2880,7,2887,2888,7,2893,2893,5,2903,2903,5,2946,2946,5,3007,3007,7,3009,3010,7,3018,3020,7,3031,3031,5,3073,3075,7,3132,3132,5,3137,3140,7,3146,3149,5,3170,3171,5,3202,3203,7,3262,3262,7,3264,3265,7,3267,3268,7,3271,3272,7,3276,3277,5,3298,3299,5,3330,3331,7,3390,3390,5,3393,3396,5,3402,3404,7,3406,3406,1,3426,3427,5,3458,3459,7,3535,3535,5,3538,3540,5,3544,3550,7,3570,3571,7,3635,3635,7,3655,3662,5,3763,3763,7,3784,3789,5,3893,3893,5,3897,3897,5,3953,3966,5,3968,3972,5,3981,3991,5,4038,4038,5,4145,4145,7,4153,4154,5,4157,4158,5,4184,4185,5,4209,4212,5,4228,4228,7,4237,4237,5,4352,4447,8,4520,4607,10,5906,5908,5,5938,5939,5,5970,5971,5,6068,6069,5,6071,6077,5,6086,6086,5,6089,6099,5,6155,6157,5,6159,6159,5,6313,6313,5,6435,6438,7,6441,6443,7,6450,6450,5,6457,6459,5,6681,6682,7,6741,6741,7,6743,6743,7,6752,6752,5,6757,6764,5,6771,6780,5,6832,6845,5,6847,6862,5,6916,6916,7,6965,6965,5,6971,6971,7,6973,6977,7,6979,6980,7,7040,7041,5,7073,7073,7,7078,7079,7,7082,7082,7,7142,7142,5,7144,7145,5,7149,7149,5,7151,7153,5,7204,7211,7,7220,7221,7,7376,7378,5,7393,7393,7,7405,7405,5,7415,7415,7,7616,7679,5,8204,8204,5,8206,8207,4,8233,8233,4,8252,8252,14,8288,8292,4,8294,8303,4,8413,8416,5,8418,8420,5,8482,8482,14,8596,8601,14,8986,8987,14,9096,9096,14,9193,9196,14,9199,9199,14,9201,9202,14,9208,9210,14,9642,9643,14,9664,9664,14,9728,9729,14,9732,9732,14,9735,9741,14,9743,9744,14,9746,9746,14,9750,9751,14,9753,9756,14,9758,9759,14,9761,9761,14,9764,9765,14,9767,9769,14,9771,9773,14,9775,9775,14,9784,9785,14,9787,9791,14,9793,9793,14,9795,9799,14,9812,9822,14,9824,9824,14,9827,9827,14,9829,9830,14,9832,9832,14,9851,9851,14,9854,9854,14,9856,9861,14,9874,9874,14,9876,9876,14,9878,9879,14,9881,9881,14,9883,9884,14,9888,9889,14,9895,9895,14,9898,9899,14,9904,9905,14,9917,9918,14,9924,9925,14,9928,9928,14,9934,9934,14,9936,9936,14,9938,9938,14,9940,9940,14,9961,9961,14,9963,9967,14,9970,9971,14,9973,9973,14,9975,9977,14,9979,9980,14,9982,9985,14,9987,9988,14,9992,9996,14,9998,9998,14,10000,10001,14,10004,10004,14,10013,10013,14,10024,10024,14,10052,10052,14,10060,10060,14,10067,10069,14,10083,10083,14,10085,10087,14,10145,10145,14,10175,10175,14,11013,11015,14,11088,11088,14,11503,11505,5,11744,11775,5,12334,12335,5,12349,12349,14,12951,12951,14,42607,42607,5,42612,42621,5,42736,42737,5,43014,43014,5,43043,43044,7,43047,43047,7,43136,43137,7,43204,43205,5,43263,43263,5,43335,43345,5,43360,43388,8,43395,43395,7,43444,43445,7,43450,43451,7,43454,43456,7,43561,43566,5,43569,43570,5,43573,43574,5,43596,43596,5,43644,43644,5,43698,43700,5,43710,43711,5,43755,43755,7,43758,43759,7,43766,43766,5,44005,44005,5,44008,44008,5,44012,44012,7,44032,44032,11,44060,44060,11,44088,44088,11,44116,44116,11,44144,44144,11,44172,44172,11,44200,44200,11,44228,44228,11,44256,44256,11,44284,44284,11,44312,44312,11,44340,44340,11,44368,44368,11,44396,44396,11,44424,44424,11,44452,44452,11,44480,44480,11,44508,44508,11,44536,44536,11,44564,44564,11,44592,44592,11,44620,44620,11,44648,44648,11,44676,44676,11,44704,44704,11,44732,44732,11,44760,44760,11,44788,44788,11,44816,44816,11,44844,44844,11,44872,44872,11,44900,44900,11,44928,44928,11,44956,44956,11,44984,44984,11,45012,45012,11,45040,45040,11,45068,45068,11,45096,45096,11,45124,45124,11,45152,45152,11,45180,45180,11,45208,45208,11,45236,45236,11,45264,45264,11,45292,45292,11,45320,45320,11,45348,45348,11,45376,45376,11,45404,45404,11,45432,45432,11,45460,45460,11,45488,45488,11,45516,45516,11,45544,45544,11,45572,45572,11,45600,45600,11,45628,45628,11,45656,45656,11,45684,45684,11,45712,45712,11,45740,45740,11,45768,45768,11,45796,45796,11,45824,45824,11,45852,45852,11,45880,45880,11,45908,45908,11,45936,45936,11,45964,45964,11,45992,45992,11,46020,46020,11,46048,46048,11,46076,46076,11,46104,46104,11,46132,46132,11,46160,46160,11,46188,46188,11,46216,46216,11,46244,46244,11,46272,46272,11,46300,46300,11,46328,46328,11,46356,46356,11,46384,46384,11,46412,46412,11,46440,46440,11,46468,46468,11,46496,46496,11,46524,46524,11,46552,46552,11,46580,46580,11,46608,46608,11,46636,46636,11,46664,46664,11,46692,46692,11,46720,46720,11,46748,46748,11,46776,46776,11,46804,46804,11,46832,46832,11,46860,46860,11,46888,46888,11,46916,46916,11,46944,46944,11,46972,46972,11,47000,47000,11,47028,47028,11,47056,47056,11,47084,47084,11,47112,47112,11,47140,47140,11,47168,47168,11,47196,47196,11,47224,47224,11,47252,47252,11,47280,47280,11,47308,47308,11,47336,47336,11,47364,47364,11,47392,47392,11,47420,47420,11,47448,47448,11,47476,47476,11,47504,47504,11,47532,47532,11,47560,47560,11,47588,47588,11,47616,47616,11,47644,47644,11,47672,47672,11,47700,47700,11,47728,47728,11,47756,47756,11,47784,47784,11,47812,47812,11,47840,47840,11,47868,47868,11,47896,47896,11,47924,47924,11,47952,47952,11,47980,47980,11,48008,48008,11,48036,48036,11,48064,48064,11,48092,48092,11,48120,48120,11,48148,48148,11,48176,48176,11,48204,48204,11,48232,48232,11,48260,48260,11,48288,48288,11,48316,48316,11,48344,48344,11,48372,48372,11,48400,48400,11,48428,48428,11,48456,48456,11,48484,48484,11,48512,48512,11,48540,48540,11,48568,48568,11,48596,48596,11,48624,48624,11,48652,48652,11,48680,48680,11,48708,48708,11,48736,48736,11,48764,48764,11,48792,48792,11,48820,48820,11,48848,48848,11,48876,48876,11,48904,48904,11,48932,48932,11,48960,48960,11,48988,48988,11,49016,49016,11,49044,49044,11,49072,49072,11,49100,49100,11,49128,49128,11,49156,49156,11,49184,49184,11,49212,49212,11,49240,49240,11,49268,49268,11,49296,49296,11,49324,49324,11,49352,49352,11,49380,49380,11,49408,49408,11,49436,49436,11,49464,49464,11,49492,49492,11,49520,49520,11,49548,49548,11,49576,49576,11,49604,49604,11,49632,49632,11,49660,49660,11,49688,49688,11,49716,49716,11,49744,49744,11,49772,49772,11,49800,49800,11,49828,49828,11,49856,49856,11,49884,49884,11,49912,49912,11,49940,49940,11,49968,49968,11,49996,49996,11,50024,50024,11,50052,50052,11,50080,50080,11,50108,50108,11,50136,50136,11,50164,50164,11,50192,50192,11,50220,50220,11,50248,50248,11,50276,50276,11,50304,50304,11,50332,50332,11,50360,50360,11,50388,50388,11,50416,50416,11,50444,50444,11,50472,50472,11,50500,50500,11,50528,50528,11,50556,50556,11,50584,50584,11,50612,50612,11,50640,50640,11,50668,50668,11,50696,50696,11,50724,50724,11,50752,50752,11,50780,50780,11,50808,50808,11,50836,50836,11,50864,50864,11,50892,50892,11,50920,50920,11,50948,50948,11,50976,50976,11,51004,51004,11,51032,51032,11,51060,51060,11,51088,51088,11,51116,51116,11,51144,51144,11,51172,51172,11,51200,51200,11,51228,51228,11,51256,51256,11,51284,51284,11,51312,51312,11,51340,51340,11,51368,51368,11,51396,51396,11,51424,51424,11,51452,51452,11,51480,51480,11,51508,51508,11,51536,51536,11,51564,51564,11,51592,51592,11,51620,51620,11,51648,51648,11,51676,51676,11,51704,51704,11,51732,51732,11,51760,51760,11,51788,51788,11,51816,51816,11,51844,51844,11,51872,51872,11,51900,51900,11,51928,51928,11,51956,51956,11,51984,51984,11,52012,52012,11,52040,52040,11,52068,52068,11,52096,52096,11,52124,52124,11,52152,52152,11,52180,52180,11,52208,52208,11,52236,52236,11,52264,52264,11,52292,52292,11,52320,52320,11,52348,52348,11,52376,52376,11,52404,52404,11,52432,52432,11,52460,52460,11,52488,52488,11,52516,52516,11,52544,52544,11,52572,52572,11,52600,52600,11,52628,52628,11,52656,52656,11,52684,52684,11,52712,52712,11,52740,52740,11,52768,52768,11,52796,52796,11,52824,52824,11,52852,52852,11,52880,52880,11,52908,52908,11,52936,52936,11,52964,52964,11,52992,52992,11,53020,53020,11,53048,53048,11,53076,53076,11,53104,53104,11,53132,53132,11,53160,53160,11,53188,53188,11,53216,53216,11,53244,53244,11,53272,53272,11,53300,53300,11,53328,53328,11,53356,53356,11,53384,53384,11,53412,53412,11,53440,53440,11,53468,53468,11,53496,53496,11,53524,53524,11,53552,53552,11,53580,53580,11,53608,53608,11,53636,53636,11,53664,53664,11,53692,53692,11,53720,53720,11,53748,53748,11,53776,53776,11,53804,53804,11,53832,53832,11,53860,53860,11,53888,53888,11,53916,53916,11,53944,53944,11,53972,53972,11,54000,54000,11,54028,54028,11,54056,54056,11,54084,54084,11,54112,54112,11,54140,54140,11,54168,54168,11,54196,54196,11,54224,54224,11,54252,54252,11,54280,54280,11,54308,54308,11,54336,54336,11,54364,54364,11,54392,54392,11,54420,54420,11,54448,54448,11,54476,54476,11,54504,54504,11,54532,54532,11,54560,54560,11,54588,54588,11,54616,54616,11,54644,54644,11,54672,54672,11,54700,54700,11,54728,54728,11,54756,54756,11,54784,54784,11,54812,54812,11,54840,54840,11,54868,54868,11,54896,54896,11,54924,54924,11,54952,54952,11,54980,54980,11,55008,55008,11,55036,55036,11,55064,55064,11,55092,55092,11,55120,55120,11,55148,55148,11,55176,55176,11,55216,55238,9,64286,64286,5,65056,65071,5,65438,65439,5,65529,65531,4,66272,66272,5,68097,68099,5,68108,68111,5,68159,68159,5,68900,68903,5,69446,69456,5,69632,69632,7,69634,69634,7,69744,69744,5,69759,69761,5,69808,69810,7,69815,69816,7,69821,69821,1,69837,69837,1,69927,69931,5,69933,69940,5,70003,70003,5,70018,70018,7,70070,70078,5,70082,70083,1,70094,70094,7,70188,70190,7,70194,70195,7,70197,70197,7,70206,70206,5,70368,70370,7,70400,70401,5,70459,70460,5,70463,70463,7,70465,70468,7,70475,70477,7,70498,70499,7,70512,70516,5,70712,70719,5,70722,70724,5,70726,70726,5,70832,70832,5,70835,70840,5,70842,70842,5,70845,70845,5,70847,70848,5,70850,70851,5,71088,71089,7,71096,71099,7,71102,71102,7,71132,71133,5,71219,71226,5,71229,71229,5,71231,71232,5,71340,71340,7,71342,71343,7,71350,71350,7,71453,71455,5,71462,71462,7,71724,71726,7,71736,71736,7,71984,71984,5,71991,71992,7,71997,71997,7,71999,71999,1,72001,72001,1,72003,72003,5,72148,72151,5,72156,72159,7,72164,72164,7,72243,72248,5,72250,72250,1,72263,72263,5,72279,72280,7,72324,72329,1,72343,72343,7,72751,72751,7,72760,72765,5,72767,72767,5,72873,72873,7,72881,72881,7,72884,72884,7,73009,73014,5,73020,73021,5,73030,73030,1,73098,73102,7,73107,73108,7,73110,73110,7,73459,73460,5,78896,78904,4,92976,92982,5,94033,94087,7,94180,94180,5,113821,113822,5,118528,118573,5,119141,119141,5,119143,119145,5,119150,119154,5,119163,119170,5,119210,119213,5,121344,121398,5,121461,121461,5,121499,121503,5,122880,122886,5,122907,122913,5,122918,122922,5,123566,123566,5,125136,125142,5,126976,126979,14,126981,127182,14,127184,127231,14,127279,127279,14,127344,127345,14,127374,127374,14,127405,127461,14,127489,127490,14,127514,127514,14,127538,127546,14,127561,127567,14,127570,127743,14,127757,127758,14,127760,127760,14,127762,127762,14,127766,127768,14,127770,127770,14,127772,127772,14,127775,127776,14,127778,127779,14,127789,127791,14,127794,127795,14,127798,127798,14,127819,127819,14,127824,127824,14,127868,127868,14,127870,127871,14,127892,127893,14,127896,127896,14,127900,127901,14,127904,127940,14,127942,127942,14,127944,127944,14,127946,127946,14,127951,127955,14,127968,127971,14,127973,127984,14,127987,127987,14,127989,127989,14,127991,127991,14,127995,127999,5,128008,128008,14,128012,128014,14,128017,128018,14,128020,128020,14,128022,128022,14,128042,128042,14,128063,128063,14,128065,128065,14,128101,128101,14,128108,128109,14,128173,128173,14,128182,128183,14,128236,128237,14,128239,128239,14,128245,128245,14,128248,128248,14,128253,128253,14,128255,128258,14,128260,128263,14,128265,128265,14,128277,128277,14,128300,128301,14,128326,128328,14,128331,128334,14,128336,128347,14,128360,128366,14,128369,128370,14,128378,128378,14,128391,128391,14,128394,128397,14,128400,128400,14,128405,128406,14,128420,128420,14,128422,128423,14,128425,128432,14,128435,128443,14,128445,128449,14,128453,128464,14,128468,128475,14,128479,128480,14,128482,128482,14,128484,128487,14,128489,128494,14,128496,128498,14,128500,128505,14,128507,128511,14,128513,128518,14,128521,128525,14,128527,128527,14,128529,128529,14,128533,128533,14,128535,128535,14,128537,128537,14]");
}
__name(getGraphemeBreakRawData, "getGraphemeBreakRawData");
function getLeftDeleteOffset(offset, str) {
  if (offset === 0) {
    return 0;
  }
  const emojiOffset = getOffsetBeforeLastEmojiComponent(offset, str);
  if (emojiOffset !== void 0) {
    return emojiOffset;
  }
  const iterator = new CodePointIterator(str, offset);
  iterator.prevCodePoint();
  return iterator.offset;
}
__name(getLeftDeleteOffset, "getLeftDeleteOffset");
function getOffsetBeforeLastEmojiComponent(initialOffset, str) {
  const iterator = new CodePointIterator(str, initialOffset);
  let codePoint = iterator.prevCodePoint();
  while (isEmojiModifier(codePoint) || codePoint === 65039 || codePoint === 8419) {
    if (iterator.offset === 0) {
      return void 0;
    }
    codePoint = iterator.prevCodePoint();
  }
  if (!isEmojiImprecise(codePoint)) {
    return void 0;
  }
  let resultOffset = iterator.offset;
  if (resultOffset > 0) {
    const optionalZwjCodePoint = iterator.prevCodePoint();
    if (optionalZwjCodePoint === 8205) {
      resultOffset = iterator.offset;
    }
  }
  return resultOffset;
}
__name(getOffsetBeforeLastEmojiComponent, "getOffsetBeforeLastEmojiComponent");
function isEmojiModifier(codePoint) {
  return 127995 <= codePoint && codePoint <= 127999;
}
__name(isEmojiModifier, "isEmojiModifier");
var CodePoint;
(function(CodePoint2) {
  CodePoint2[CodePoint2["zwj"] = 8205] = "zwj";
  CodePoint2[CodePoint2["emojiVariantSelector"] = 65039] = "emojiVariantSelector";
  CodePoint2[CodePoint2["enclosingKeyCap"] = 8419] = "enclosingKeyCap";
  CodePoint2[CodePoint2["space"] = 32] = "space";
})(CodePoint || (CodePoint = {}));
var noBreakWhitespace = "\xA0";
var AmbiguousCharacters = class _AmbiguousCharacters {
  static {
    __name(this, "AmbiguousCharacters");
  }
  static {
    this.ambiguousCharacterData = new Lazy(() => {
      return JSON.parse('{"_common":[8232,32,8233,32,5760,32,8192,32,8193,32,8194,32,8195,32,8196,32,8197,32,8198,32,8200,32,8201,32,8202,32,8287,32,8199,32,8239,32,2042,95,65101,95,65102,95,65103,95,8208,45,8209,45,8210,45,65112,45,1748,45,8259,45,727,45,8722,45,10134,45,11450,45,1549,44,1643,44,184,44,42233,44,894,59,2307,58,2691,58,1417,58,1795,58,1796,58,5868,58,65072,58,6147,58,6153,58,8282,58,1475,58,760,58,42889,58,8758,58,720,58,42237,58,451,33,11601,33,660,63,577,63,2429,63,5038,63,42731,63,119149,46,8228,46,1793,46,1794,46,42510,46,68176,46,1632,46,1776,46,42232,46,1373,96,65287,96,8219,96,1523,96,8242,96,1370,96,8175,96,65344,96,900,96,8189,96,8125,96,8127,96,8190,96,697,96,884,96,712,96,714,96,715,96,756,96,699,96,701,96,700,96,702,96,42892,96,1497,96,2036,96,2037,96,5194,96,5836,96,94033,96,94034,96,65339,91,10088,40,10098,40,12308,40,64830,40,65341,93,10089,41,10099,41,12309,41,64831,41,10100,123,119060,123,10101,125,65342,94,8270,42,1645,42,8727,42,66335,42,5941,47,8257,47,8725,47,8260,47,9585,47,10187,47,10744,47,119354,47,12755,47,12339,47,11462,47,20031,47,12035,47,65340,92,65128,92,8726,92,10189,92,10741,92,10745,92,119311,92,119355,92,12756,92,20022,92,12034,92,42872,38,708,94,710,94,5869,43,10133,43,66203,43,8249,60,10094,60,706,60,119350,60,5176,60,5810,60,5120,61,11840,61,12448,61,42239,61,8250,62,10095,62,707,62,119351,62,5171,62,94015,62,8275,126,732,126,8128,126,8764,126,65372,124,65293,45,118002,50,120784,50,120794,50,120804,50,120814,50,120824,50,130034,50,42842,50,423,50,1000,50,42564,50,5311,50,42735,50,119302,51,118003,51,120785,51,120795,51,120805,51,120815,51,120825,51,130035,51,42923,51,540,51,439,51,42858,51,11468,51,1248,51,94011,51,71882,51,118004,52,120786,52,120796,52,120806,52,120816,52,120826,52,130036,52,5070,52,71855,52,118005,53,120787,53,120797,53,120807,53,120817,53,120827,53,130037,53,444,53,71867,53,118006,54,120788,54,120798,54,120808,54,120818,54,120828,54,130038,54,11474,54,5102,54,71893,54,119314,55,118007,55,120789,55,120799,55,120809,55,120819,55,120829,55,130039,55,66770,55,71878,55,2819,56,2538,56,2666,56,125131,56,118008,56,120790,56,120800,56,120810,56,120820,56,120830,56,130040,56,547,56,546,56,66330,56,2663,57,2920,57,2541,57,3437,57,118009,57,120791,57,120801,57,120811,57,120821,57,120831,57,130041,57,42862,57,11466,57,71884,57,71852,57,71894,57,9082,97,65345,97,119834,97,119886,97,119938,97,119990,97,120042,97,120094,97,120146,97,120198,97,120250,97,120302,97,120354,97,120406,97,120458,97,593,97,945,97,120514,97,120572,97,120630,97,120688,97,120746,97,65313,65,117974,65,119808,65,119860,65,119912,65,119964,65,120016,65,120068,65,120120,65,120172,65,120224,65,120276,65,120328,65,120380,65,120432,65,913,65,120488,65,120546,65,120604,65,120662,65,120720,65,5034,65,5573,65,42222,65,94016,65,66208,65,119835,98,119887,98,119939,98,119991,98,120043,98,120095,98,120147,98,120199,98,120251,98,120303,98,120355,98,120407,98,120459,98,388,98,5071,98,5234,98,5551,98,65314,66,8492,66,117975,66,119809,66,119861,66,119913,66,120017,66,120069,66,120121,66,120173,66,120225,66,120277,66,120329,66,120381,66,120433,66,42932,66,914,66,120489,66,120547,66,120605,66,120663,66,120721,66,5108,66,5623,66,42192,66,66178,66,66209,66,66305,66,65347,99,8573,99,119836,99,119888,99,119940,99,119992,99,120044,99,120096,99,120148,99,120200,99,120252,99,120304,99,120356,99,120408,99,120460,99,7428,99,1010,99,11429,99,43951,99,66621,99,128844,67,71913,67,71922,67,65315,67,8557,67,8450,67,8493,67,117976,67,119810,67,119862,67,119914,67,119966,67,120018,67,120174,67,120226,67,120278,67,120330,67,120382,67,120434,67,1017,67,11428,67,5087,67,42202,67,66210,67,66306,67,66581,67,66844,67,8574,100,8518,100,119837,100,119889,100,119941,100,119993,100,120045,100,120097,100,120149,100,120201,100,120253,100,120305,100,120357,100,120409,100,120461,100,1281,100,5095,100,5231,100,42194,100,8558,68,8517,68,117977,68,119811,68,119863,68,119915,68,119967,68,120019,68,120071,68,120123,68,120175,68,120227,68,120279,68,120331,68,120383,68,120435,68,5024,68,5598,68,5610,68,42195,68,8494,101,65349,101,8495,101,8519,101,119838,101,119890,101,119942,101,120046,101,120098,101,120150,101,120202,101,120254,101,120306,101,120358,101,120410,101,120462,101,43826,101,1213,101,8959,69,65317,69,8496,69,117978,69,119812,69,119864,69,119916,69,120020,69,120072,69,120124,69,120176,69,120228,69,120280,69,120332,69,120384,69,120436,69,917,69,120492,69,120550,69,120608,69,120666,69,120724,69,11577,69,5036,69,42224,69,71846,69,71854,69,66182,69,119839,102,119891,102,119943,102,119995,102,120047,102,120099,102,120151,102,120203,102,120255,102,120307,102,120359,102,120411,102,120463,102,43829,102,42905,102,383,102,7837,102,1412,102,119315,70,8497,70,117979,70,119813,70,119865,70,119917,70,120021,70,120073,70,120125,70,120177,70,120229,70,120281,70,120333,70,120385,70,120437,70,42904,70,988,70,120778,70,5556,70,42205,70,71874,70,71842,70,66183,70,66213,70,66853,70,65351,103,8458,103,119840,103,119892,103,119944,103,120048,103,120100,103,120152,103,120204,103,120256,103,120308,103,120360,103,120412,103,120464,103,609,103,7555,103,397,103,1409,103,117980,71,119814,71,119866,71,119918,71,119970,71,120022,71,120074,71,120126,71,120178,71,120230,71,120282,71,120334,71,120386,71,120438,71,1292,71,5056,71,5107,71,42198,71,65352,104,8462,104,119841,104,119945,104,119997,104,120049,104,120101,104,120153,104,120205,104,120257,104,120309,104,120361,104,120413,104,120465,104,1211,104,1392,104,5058,104,65320,72,8459,72,8460,72,8461,72,117981,72,119815,72,119867,72,119919,72,120023,72,120179,72,120231,72,120283,72,120335,72,120387,72,120439,72,919,72,120494,72,120552,72,120610,72,120668,72,120726,72,11406,72,5051,72,5500,72,42215,72,66255,72,731,105,9075,105,65353,105,8560,105,8505,105,8520,105,119842,105,119894,105,119946,105,119998,105,120050,105,120102,105,120154,105,120206,105,120258,105,120310,105,120362,105,120414,105,120466,105,120484,105,618,105,617,105,953,105,8126,105,890,105,120522,105,120580,105,120638,105,120696,105,120754,105,1110,105,42567,105,1231,105,43893,105,5029,105,71875,105,65354,106,8521,106,119843,106,119895,106,119947,106,119999,106,120051,106,120103,106,120155,106,120207,106,120259,106,120311,106,120363,106,120415,106,120467,106,1011,106,1112,106,65322,74,117983,74,119817,74,119869,74,119921,74,119973,74,120025,74,120077,74,120129,74,120181,74,120233,74,120285,74,120337,74,120389,74,120441,74,42930,74,895,74,1032,74,5035,74,5261,74,42201,74,119844,107,119896,107,119948,107,120000,107,120052,107,120104,107,120156,107,120208,107,120260,107,120312,107,120364,107,120416,107,120468,107,8490,75,65323,75,117984,75,119818,75,119870,75,119922,75,119974,75,120026,75,120078,75,120130,75,120182,75,120234,75,120286,75,120338,75,120390,75,120442,75,922,75,120497,75,120555,75,120613,75,120671,75,120729,75,11412,75,5094,75,5845,75,42199,75,66840,75,1472,108,8739,73,9213,73,65512,73,1633,108,1777,73,66336,108,125127,108,118001,108,120783,73,120793,73,120803,73,120813,73,120823,73,130033,73,65321,73,8544,73,8464,73,8465,73,117982,108,119816,73,119868,73,119920,73,120024,73,120128,73,120180,73,120232,73,120284,73,120336,73,120388,73,120440,73,65356,108,8572,73,8467,108,119845,108,119897,108,119949,108,120001,108,120053,108,120105,73,120157,73,120209,73,120261,73,120313,73,120365,73,120417,73,120469,73,448,73,120496,73,120554,73,120612,73,120670,73,120728,73,11410,73,1030,73,1216,73,1493,108,1503,108,1575,108,126464,108,126592,108,65166,108,65165,108,1994,108,11599,73,5825,73,42226,73,93992,73,66186,124,66313,124,119338,76,8556,76,8466,76,117985,76,119819,76,119871,76,119923,76,120027,76,120079,76,120131,76,120183,76,120235,76,120287,76,120339,76,120391,76,120443,76,11472,76,5086,76,5290,76,42209,76,93974,76,71843,76,71858,76,66587,76,66854,76,65325,77,8559,77,8499,77,117986,77,119820,77,119872,77,119924,77,120028,77,120080,77,120132,77,120184,77,120236,77,120288,77,120340,77,120392,77,120444,77,924,77,120499,77,120557,77,120615,77,120673,77,120731,77,1018,77,11416,77,5047,77,5616,77,5846,77,42207,77,66224,77,66321,77,119847,110,119899,110,119951,110,120003,110,120055,110,120107,110,120159,110,120211,110,120263,110,120315,110,120367,110,120419,110,120471,110,1400,110,1404,110,65326,78,8469,78,117987,78,119821,78,119873,78,119925,78,119977,78,120029,78,120081,78,120185,78,120237,78,120289,78,120341,78,120393,78,120445,78,925,78,120500,78,120558,78,120616,78,120674,78,120732,78,11418,78,42208,78,66835,78,3074,111,3202,111,3330,111,3458,111,2406,111,2662,111,2790,111,3046,111,3174,111,3302,111,3430,111,3664,111,3792,111,4160,111,1637,111,1781,111,65359,111,8500,111,119848,111,119900,111,119952,111,120056,111,120108,111,120160,111,120212,111,120264,111,120316,111,120368,111,120420,111,120472,111,7439,111,7441,111,43837,111,959,111,120528,111,120586,111,120644,111,120702,111,120760,111,963,111,120532,111,120590,111,120648,111,120706,111,120764,111,11423,111,4351,111,1413,111,1505,111,1607,111,126500,111,126564,111,126596,111,65259,111,65260,111,65258,111,65257,111,1726,111,64428,111,64429,111,64427,111,64426,111,1729,111,64424,111,64425,111,64423,111,64422,111,1749,111,3360,111,4125,111,66794,111,71880,111,71895,111,66604,111,1984,79,2534,79,2918,79,12295,79,70864,79,71904,79,118000,79,120782,79,120792,79,120802,79,120812,79,120822,79,130032,79,65327,79,117988,79,119822,79,119874,79,119926,79,119978,79,120030,79,120082,79,120134,79,120186,79,120238,79,120290,79,120342,79,120394,79,120446,79,927,79,120502,79,120560,79,120618,79,120676,79,120734,79,11422,79,1365,79,11604,79,4816,79,2848,79,66754,79,42227,79,71861,79,66194,79,66219,79,66564,79,66838,79,9076,112,65360,112,119849,112,119901,112,119953,112,120005,112,120057,112,120109,112,120161,112,120213,112,120265,112,120317,112,120369,112,120421,112,120473,112,961,112,120530,112,120544,112,120588,112,120602,112,120646,112,120660,112,120704,112,120718,112,120762,112,120776,112,11427,112,65328,80,8473,80,117989,80,119823,80,119875,80,119927,80,119979,80,120031,80,120083,80,120187,80,120239,80,120291,80,120343,80,120395,80,120447,80,929,80,120504,80,120562,80,120620,80,120678,80,120736,80,11426,80,5090,80,5229,80,42193,80,66197,80,119850,113,119902,113,119954,113,120006,113,120058,113,120110,113,120162,113,120214,113,120266,113,120318,113,120370,113,120422,113,120474,113,1307,113,1379,113,1382,113,8474,81,117990,81,119824,81,119876,81,119928,81,119980,81,120032,81,120084,81,120188,81,120240,81,120292,81,120344,81,120396,81,120448,81,11605,81,119851,114,119903,114,119955,114,120007,114,120059,114,120111,114,120163,114,120215,114,120267,114,120319,114,120371,114,120423,114,120475,114,43847,114,43848,114,7462,114,11397,114,43905,114,119318,82,8475,82,8476,82,8477,82,117991,82,119825,82,119877,82,119929,82,120033,82,120189,82,120241,82,120293,82,120345,82,120397,82,120449,82,422,82,5025,82,5074,82,66740,82,5511,82,42211,82,94005,82,65363,115,119852,115,119904,115,119956,115,120008,115,120060,115,120112,115,120164,115,120216,115,120268,115,120320,115,120372,115,120424,115,120476,115,42801,115,445,115,1109,115,43946,115,71873,115,66632,115,65331,83,117992,83,119826,83,119878,83,119930,83,119982,83,120034,83,120086,83,120138,83,120190,83,120242,83,120294,83,120346,83,120398,83,120450,83,1029,83,1359,83,5077,83,5082,83,42210,83,94010,83,66198,83,66592,83,119853,116,119905,116,119957,116,120009,116,120061,116,120113,116,120165,116,120217,116,120269,116,120321,116,120373,116,120425,116,120477,116,8868,84,10201,84,128872,84,65332,84,117993,84,119827,84,119879,84,119931,84,119983,84,120035,84,120087,84,120139,84,120191,84,120243,84,120295,84,120347,84,120399,84,120451,84,932,84,120507,84,120565,84,120623,84,120681,84,120739,84,11430,84,5026,84,42196,84,93962,84,71868,84,66199,84,66225,84,66325,84,119854,117,119906,117,119958,117,120010,117,120062,117,120114,117,120166,117,120218,117,120270,117,120322,117,120374,117,120426,117,120478,117,42911,117,7452,117,43854,117,43858,117,651,117,965,117,120534,117,120592,117,120650,117,120708,117,120766,117,1405,117,66806,117,71896,117,8746,85,8899,85,117994,85,119828,85,119880,85,119932,85,119984,85,120036,85,120088,85,120140,85,120192,85,120244,85,120296,85,120348,85,120400,85,120452,85,1357,85,4608,85,66766,85,5196,85,42228,85,94018,85,71864,85,8744,118,8897,118,65366,118,8564,118,119855,118,119907,118,119959,118,120011,118,120063,118,120115,118,120167,118,120219,118,120271,118,120323,118,120375,118,120427,118,120479,118,7456,118,957,118,120526,118,120584,118,120642,118,120700,118,120758,118,1141,118,1496,118,71430,118,43945,118,71872,118,119309,86,1639,86,1783,86,8548,86,117995,86,119829,86,119881,86,119933,86,119985,86,120037,86,120089,86,120141,86,120193,86,120245,86,120297,86,120349,86,120401,86,120453,86,1140,86,11576,86,5081,86,5167,86,42719,86,42214,86,93960,86,71840,86,66845,86,623,119,119856,119,119908,119,119960,119,120012,119,120064,119,120116,119,120168,119,120220,119,120272,119,120324,119,120376,119,120428,119,120480,119,7457,119,1121,119,1309,119,1377,119,71434,119,71438,119,71439,119,43907,119,71910,87,71919,87,117996,87,119830,87,119882,87,119934,87,119986,87,120038,87,120090,87,120142,87,120194,87,120246,87,120298,87,120350,87,120402,87,120454,87,1308,87,5043,87,5076,87,42218,87,5742,120,10539,120,10540,120,10799,120,65368,120,8569,120,119857,120,119909,120,119961,120,120013,120,120065,120,120117,120,120169,120,120221,120,120273,120,120325,120,120377,120,120429,120,120481,120,5441,120,5501,120,5741,88,9587,88,66338,88,71916,88,65336,88,8553,88,117997,88,119831,88,119883,88,119935,88,119987,88,120039,88,120091,88,120143,88,120195,88,120247,88,120299,88,120351,88,120403,88,120455,88,42931,88,935,88,120510,88,120568,88,120626,88,120684,88,120742,88,11436,88,11613,88,5815,88,42219,88,66192,88,66228,88,66327,88,66855,88,611,121,7564,121,65369,121,119858,121,119910,121,119962,121,120014,121,120066,121,120118,121,120170,121,120222,121,120274,121,120326,121,120378,121,120430,121,120482,121,655,121,7935,121,43866,121,947,121,8509,121,120516,121,120574,121,120632,121,120690,121,120748,121,1199,121,4327,121,71900,121,65337,89,117998,89,119832,89,119884,89,119936,89,119988,89,120040,89,120092,89,120144,89,120196,89,120248,89,120300,89,120352,89,120404,89,120456,89,933,89,978,89,120508,89,120566,89,120624,89,120682,89,120740,89,11432,89,1198,89,5033,89,5053,89,42220,89,94019,89,71844,89,66226,89,119859,122,119911,122,119963,122,120015,122,120067,122,120119,122,120171,122,120223,122,120275,122,120327,122,120379,122,120431,122,120483,122,7458,122,43923,122,71876,122,71909,90,66293,90,65338,90,8484,90,8488,90,117999,90,119833,90,119885,90,119937,90,119989,90,120041,90,120197,90,120249,90,120301,90,120353,90,120405,90,120457,90,918,90,120493,90,120551,90,120609,90,120667,90,120725,90,5059,90,42204,90,71849,90,65282,34,65283,35,65284,36,65285,37,65286,38,65290,42,65291,43,65294,46,65295,47,65296,48,65298,50,65299,51,65300,52,65301,53,65302,54,65303,55,65304,56,65305,57,65308,60,65309,61,65310,62,65312,64,65316,68,65318,70,65319,71,65324,76,65329,81,65330,82,65333,85,65334,86,65335,87,65343,95,65346,98,65348,100,65350,102,65355,107,65357,109,65358,110,65361,113,65362,114,65364,116,65365,117,65367,119,65370,122,65371,123,65373,125,119846,109],"_default":[160,32,8211,45,65374,126,8218,44,65306,58,65281,33,8216,96,8217,96,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"cs":[65374,126,8218,44,65306,58,65281,33,8216,96,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"de":[65374,126,65306,58,65281,33,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"es":[8211,45,65374,126,8218,44,65306,58,65281,33,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"fr":[65374,126,8218,44,65306,58,65281,33,8216,96,8245,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"it":[160,32,8211,45,65374,126,8218,44,65306,58,65281,33,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"ja":[8211,45,8218,44,65281,33,8216,96,8245,96,180,96,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65292,44,65297,49,65307,59],"ko":[8211,45,65374,126,8218,44,65306,58,65281,33,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"pl":[65374,126,65306,58,65281,33,8216,96,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"pt-BR":[65374,126,8218,44,65306,58,65281,33,8216,96,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"qps-ploc":[160,32,8211,45,65374,126,8218,44,65306,58,65281,33,8216,96,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"ru":[65374,126,8218,44,65306,58,65281,33,8216,96,8245,96,180,96,12494,47,305,105,921,73,1009,112,215,120,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"tr":[160,32,8211,45,65374,126,8218,44,65306,58,65281,33,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"zh-hans":[160,32,65374,126,8218,44,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65297,49],"zh-hant":[8211,45,65374,126,8218,44,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89]}');
    });
  }
  static {
    this.cache = new LRUCachedFunction((localesStr) => {
      const locales = localesStr.split(",");
      function arrayToMap(arr) {
        const result = /* @__PURE__ */ new Map();
        for (let i = 0; i < arr.length; i += 2) {
          result.set(arr[i], arr[i + 1]);
        }
        return result;
      }
      __name(arrayToMap, "arrayToMap");
      function mergeMaps(map1, map2) {
        const result = new Map(map1);
        for (const [key, value] of map2) {
          result.set(key, value);
        }
        return result;
      }
      __name(mergeMaps, "mergeMaps");
      function intersectMaps(map1, map2) {
        if (!map1) {
          return map2;
        }
        const result = /* @__PURE__ */ new Map();
        for (const [key, value] of map1) {
          if (map2.has(key)) {
            result.set(key, value);
          }
        }
        return result;
      }
      __name(intersectMaps, "intersectMaps");
      const data = this.ambiguousCharacterData.value;
      let filteredLocales = locales.filter((l) => !l.startsWith("_") && Object.hasOwn(data, l));
      if (filteredLocales.length === 0) {
        filteredLocales = ["_default"];
      }
      let languageSpecificMap = void 0;
      for (const locale2 of filteredLocales) {
        const map2 = arrayToMap(data[locale2]);
        languageSpecificMap = intersectMaps(languageSpecificMap, map2);
      }
      const commonMap = arrayToMap(data["_common"]);
      const map = mergeMaps(commonMap, languageSpecificMap);
      return new _AmbiguousCharacters(map);
    });
  }
  static getInstance(locales) {
    return _AmbiguousCharacters.cache.get(Array.from(locales).join(","));
  }
  static {
    this._locales = new Lazy(() => Object.keys(_AmbiguousCharacters.ambiguousCharacterData.value).filter((k) => !k.startsWith("_")));
  }
  static getLocales() {
    return _AmbiguousCharacters._locales.value;
  }
  constructor(confusableDictionary) {
    this.confusableDictionary = confusableDictionary;
  }
  isAmbiguous(codePoint) {
    return this.confusableDictionary.has(codePoint);
  }
  containsAmbiguousCharacter(str) {
    for (let i = 0; i < str.length; i++) {
      const codePoint = str.codePointAt(i);
      if (typeof codePoint === "number" && this.isAmbiguous(codePoint)) {
        return true;
      }
    }
    return false;
  }
  /**
   * Returns the non basic ASCII code point that the given code point can be confused,
   * or undefined if such code point does note exist.
   */
  getPrimaryConfusable(codePoint) {
    return this.confusableDictionary.get(codePoint);
  }
  getConfusableCodePoints() {
    return new Set(this.confusableDictionary.keys());
  }
};
var InvisibleCharacters = class _InvisibleCharacters {
  static {
    __name(this, "InvisibleCharacters");
  }
  static getRawData() {
    return JSON.parse('{"_common":[11,12,13,127,847,1564,4447,4448,6068,6069,6155,6156,6157,6158,7355,7356,8192,8193,8194,8195,8196,8197,8198,8199,8200,8201,8202,8204,8205,8206,8207,8234,8235,8236,8237,8238,8239,8287,8288,8289,8290,8291,8292,8293,8294,8295,8296,8297,8298,8299,8300,8301,8302,8303,10240,12644,65024,65025,65026,65027,65028,65029,65030,65031,65032,65033,65034,65035,65036,65037,65038,65039,65279,65440,65520,65521,65522,65523,65524,65525,65526,65527,65528,65532,78844,119155,119156,119157,119158,119159,119160,119161,119162,917504,917505,917506,917507,917508,917509,917510,917511,917512,917513,917514,917515,917516,917517,917518,917519,917520,917521,917522,917523,917524,917525,917526,917527,917528,917529,917530,917531,917532,917533,917534,917535,917536,917537,917538,917539,917540,917541,917542,917543,917544,917545,917546,917547,917548,917549,917550,917551,917552,917553,917554,917555,917556,917557,917558,917559,917560,917561,917562,917563,917564,917565,917566,917567,917568,917569,917570,917571,917572,917573,917574,917575,917576,917577,917578,917579,917580,917581,917582,917583,917584,917585,917586,917587,917588,917589,917590,917591,917592,917593,917594,917595,917596,917597,917598,917599,917600,917601,917602,917603,917604,917605,917606,917607,917608,917609,917610,917611,917612,917613,917614,917615,917616,917617,917618,917619,917620,917621,917622,917623,917624,917625,917626,917627,917628,917629,917630,917631,917760,917761,917762,917763,917764,917765,917766,917767,917768,917769,917770,917771,917772,917773,917774,917775,917776,917777,917778,917779,917780,917781,917782,917783,917784,917785,917786,917787,917788,917789,917790,917791,917792,917793,917794,917795,917796,917797,917798,917799,917800,917801,917802,917803,917804,917805,917806,917807,917808,917809,917810,917811,917812,917813,917814,917815,917816,917817,917818,917819,917820,917821,917822,917823,917824,917825,917826,917827,917828,917829,917830,917831,917832,917833,917834,917835,917836,917837,917838,917839,917840,917841,917842,917843,917844,917845,917846,917847,917848,917849,917850,917851,917852,917853,917854,917855,917856,917857,917858,917859,917860,917861,917862,917863,917864,917865,917866,917867,917868,917869,917870,917871,917872,917873,917874,917875,917876,917877,917878,917879,917880,917881,917882,917883,917884,917885,917886,917887,917888,917889,917890,917891,917892,917893,917894,917895,917896,917897,917898,917899,917900,917901,917902,917903,917904,917905,917906,917907,917908,917909,917910,917911,917912,917913,917914,917915,917916,917917,917918,917919,917920,917921,917922,917923,917924,917925,917926,917927,917928,917929,917930,917931,917932,917933,917934,917935,917936,917937,917938,917939,917940,917941,917942,917943,917944,917945,917946,917947,917948,917949,917950,917951,917952,917953,917954,917955,917956,917957,917958,917959,917960,917961,917962,917963,917964,917965,917966,917967,917968,917969,917970,917971,917972,917973,917974,917975,917976,917977,917978,917979,917980,917981,917982,917983,917984,917985,917986,917987,917988,917989,917990,917991,917992,917993,917994,917995,917996,917997,917998,917999],"cs":[173,8203,12288],"de":[173,8203,12288],"es":[8203,12288],"fr":[173,8203,12288],"it":[160,173,12288],"ja":[173],"ko":[173,12288],"pl":[173,8203,12288],"pt-BR":[173,8203,12288],"qps-ploc":[160,173,8203,12288],"ru":[173,12288],"tr":[160,173,8203,12288],"zh-hans":[160,173,8203,12288],"zh-hant":[173,12288]}');
  }
  static {
    this._data = void 0;
  }
  static getData() {
    if (!this._data) {
      this._data = new Set([...Object.values(_InvisibleCharacters.getRawData())].flat());
    }
    return this._data;
  }
  static isInvisibleCharacter(codePoint) {
    return _InvisibleCharacters.getData().has(codePoint);
  }
  static containsInvisibleCharacter(str) {
    for (let i = 0; i < str.length; i++) {
      const codePoint = str.codePointAt(i);
      if (typeof codePoint === "number" && (_InvisibleCharacters.isInvisibleCharacter(codePoint) || codePoint === 32)) {
        return true;
      }
    }
    return false;
  }
  static get codePoints() {
    return _InvisibleCharacters.getData();
  }
};
var Ellipsis = "\u2026";
function toBinary(str) {
  const codeUnits = new Uint16Array(str.length);
  for (let i = 0; i < codeUnits.length; i++) {
    codeUnits[i] = str.charCodeAt(i);
  }
  let binary = "";
  const uint8array = new Uint8Array(codeUnits.buffer);
  for (let i = 0; i < uint8array.length; i++) {
    binary += String.fromCharCode(uint8array[i]);
  }
  return binary;
}
__name(toBinary, "toBinary");
function multibyteAwareBtoa(str) {
  return btoa(toBinary(str));
}
__name(multibyteAwareBtoa, "multibyteAwareBtoa");

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/uri.js
var _schemePattern = /^\w[\w\d+.-]*$/;
var _singleSlashStart = /^\//;
var _doubleSlashStart = /^\/\//;
function _validateUri(ret, _strict) {
  if (!ret.scheme && _strict) {
    throw new Error(`[UriError]: Scheme is missing: {scheme: "", authority: "${ret.authority}", path: "${ret.path}", query: "${ret.query}", fragment: "${ret.fragment}"}`);
  }
  if (ret.scheme && !_schemePattern.test(ret.scheme)) {
    const matches = [...ret.scheme.matchAll(/[^\w\d+.-]/gu)];
    const detail = matches.length > 0 ? ` Found '${matches[0][0]}' at index ${matches[0].index} (${matches.length} total)` : "";
    throw new Error(`[UriError]: Scheme contains illegal characters.${detail} (len:${ret.scheme.length})`);
  }
  if (ret.path) {
    if (ret.authority) {
      if (!_singleSlashStart.test(ret.path)) {
        throw new Error('[UriError]: If a URI contains an authority component, then the path component must either be empty or begin with a slash ("/") character');
      }
    } else {
      if (_doubleSlashStart.test(ret.path)) {
        throw new Error('[UriError]: If a URI does not contain an authority component, then the path cannot begin with two slash characters ("//")');
      }
    }
  }
}
__name(_validateUri, "_validateUri");
function _schemeFix(scheme, _strict) {
  if (!scheme && !_strict) {
    return "file";
  }
  return scheme;
}
__name(_schemeFix, "_schemeFix");
function _referenceResolution(scheme, path) {
  switch (scheme) {
    case "https":
    case "http":
    case "file":
      if (!path) {
        path = _slash;
      } else if (path[0] !== _slash) {
        path = _slash + path;
      }
      break;
  }
  return path;
}
__name(_referenceResolution, "_referenceResolution");
var _empty = "";
var _slash = "/";
var _regexp = /^(([^:/?#]+?):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;
var URI = class _URI {
  static {
    __name(this, "URI");
  }
  static isUri(thing) {
    if (thing instanceof _URI) {
      return true;
    }
    if (!thing || typeof thing !== "object") {
      return false;
    }
    return typeof thing.authority === "string" && typeof thing.fragment === "string" && typeof thing.path === "string" && typeof thing.query === "string" && typeof thing.scheme === "string" && typeof thing.fsPath === "string" && typeof thing.with === "function" && typeof thing.toString === "function";
  }
  /**
   * @internal
   */
  constructor(schemeOrData, authority, path, query, fragment, _strict = false) {
    if (typeof schemeOrData === "object") {
      this.scheme = schemeOrData.scheme || _empty;
      this.authority = schemeOrData.authority || _empty;
      this.path = schemeOrData.path || _empty;
      this.query = schemeOrData.query || _empty;
      this.fragment = schemeOrData.fragment || _empty;
    } else {
      this.scheme = _schemeFix(schemeOrData, _strict);
      this.authority = authority || _empty;
      this.path = _referenceResolution(this.scheme, path || _empty);
      this.query = query || _empty;
      this.fragment = fragment || _empty;
      _validateUri(this, _strict);
    }
  }
  // ---- filesystem path -----------------------
  /**
   * Returns a string representing the corresponding file system path of this URI.
   * Will handle UNC paths, normalizes windows drive letters to lower-case, and uses the
   * platform specific path separator.
   *
   * * Will *not* validate the path for invalid characters and semantics.
   * * Will *not* look at the scheme of this URI.
   * * The result shall *not* be used for display purposes but for accessing a file on disk.
   *
   *
   * The *difference* to `URI#path` is the use of the platform specific separator and the handling
   * of UNC paths. See the below sample of a file-uri with an authority (UNC path).
   *
   * ```ts
      const u = URI.parse('file://server/c$/folder/file.txt')
      u.authority === 'server'
      u.path === '/shares/c$/file.txt'
      u.fsPath === '\\server\c$\folder\file.txt'
  ```
   *
   * Using `URI#path` to read a file (using fs-apis) would not be enough because parts of the path,
   * namely the server name, would be missing. Therefore `URI#fsPath` exists - it's sugar to ease working
   * with URIs that represent files on disk (`file` scheme).
   */
  get fsPath() {
    return uriToFsPath(this, false);
  }
  // ---- modify to new -------------------------
  with(change) {
    if (!change) {
      return this;
    }
    let { scheme, authority, path, query, fragment } = change;
    if (scheme === void 0) {
      scheme = this.scheme;
    } else if (scheme === null) {
      scheme = _empty;
    }
    if (authority === void 0) {
      authority = this.authority;
    } else if (authority === null) {
      authority = _empty;
    }
    if (path === void 0) {
      path = this.path;
    } else if (path === null) {
      path = _empty;
    }
    if (query === void 0) {
      query = this.query;
    } else if (query === null) {
      query = _empty;
    }
    if (fragment === void 0) {
      fragment = this.fragment;
    } else if (fragment === null) {
      fragment = _empty;
    }
    if (scheme === this.scheme && authority === this.authority && path === this.path && query === this.query && fragment === this.fragment) {
      return this;
    }
    return new Uri(scheme, authority, path, query, fragment);
  }
  // ---- parse & validate ------------------------
  /**
   * Creates a new URI from a string, e.g. `http://www.example.com/some/path`,
   * `file:///usr/home`, or `scheme:with/path`.
   *
   * @param value A string which represents an URI (see `URI#toString`).
   */
  static parse(value, _strict = false) {
    const match = _regexp.exec(value);
    if (!match) {
      return new Uri(_empty, _empty, _empty, _empty, _empty);
    }
    return new Uri(match[2] || _empty, percentDecode(match[4] || _empty), percentDecode(match[5] || _empty), percentDecode(match[7] || _empty), percentDecode(match[9] || _empty), _strict);
  }
  /**
   * Creates a new URI from a file system path, e.g. `c:\my\files`,
   * `/usr/home`, or `\\server\share\some\path`.
   *
   * The *difference* between `URI#parse` and `URI#file` is that the latter treats the argument
   * as path, not as stringified-uri. E.g. `URI.file(path)` is **not the same as**
   * `URI.parse('file://' + path)` because the path might contain characters that are
   * interpreted (# and ?). See the following sample:
   * ```ts
  const good = URI.file('/coding/c#/project1');
  good.scheme === 'file';
  good.path === '/coding/c#/project1';
  good.fragment === '';
  const bad = URI.parse('file://' + '/coding/c#/project1');
  bad.scheme === 'file';
  bad.path === '/coding/c'; // path is now broken
  bad.fragment === '/project1';
  ```
   *
   * @param path A file system path (see `URI#fsPath`)
   */
  static file(path) {
    let authority = _empty;
    if (isWindows) {
      path = path.replace(/\\/g, _slash);
    }
    if (path[0] === _slash && path[1] === _slash) {
      const idx = path.indexOf(_slash, 2);
      if (idx === -1) {
        authority = path.substring(2);
        path = _slash;
      } else {
        authority = path.substring(2, idx);
        path = path.substring(idx) || _slash;
      }
    }
    return new Uri("file", authority, path, _empty, _empty);
  }
  /**
   * Creates new URI from uri components.
   *
   * Unless `strict` is `true` the scheme is defaults to be `file`. This function performs
   * validation and should be used for untrusted uri components retrieved from storage,
   * user input, command arguments etc
   */
  static from(components, strict) {
    const result = new Uri(components.scheme, components.authority, components.path, components.query, components.fragment, strict);
    return result;
  }
  /**
   * Join a URI path with path fragments and normalizes the resulting path.
   *
   * @param uri The input URI.
   * @param pathFragment The path fragment to add to the URI path.
   * @returns The resulting URI.
   */
  static joinPath(uri, ...pathFragment) {
    if (!uri.path) {
      throw new Error(`[UriError]: cannot call joinPath on URI without path: ${uri.toString()}`);
    }
    let newPath;
    if (isWindows && uri.scheme === "file") {
      newPath = _URI.file(win32.join(uriToFsPath(uri, true), ...pathFragment)).path;
    } else {
      newPath = posix.join(uri.path, ...pathFragment);
    }
    return uri.with({ path: newPath });
  }
  // ---- printing/externalize ---------------------------
  /**
   * Creates a string representation for this URI. It's guaranteed that calling
   * `URI.parse` with the result of this function creates an URI which is equal
   * to this URI.
   *
   * * The result shall *not* be used for display purposes but for externalization or transport.
   * * The result will be encoded using the percentage encoding and encoding happens mostly
   * ignore the scheme-specific encoding rules.
   *
   * @param skipEncoding Do not encode the result, default is `false`
   */
  toString(skipEncoding = false) {
    return _asFormatted(this, skipEncoding);
  }
  toJSON() {
    return this;
  }
  static revive(data) {
    if (!data) {
      return data;
    } else if (data instanceof _URI) {
      return data;
    } else {
      const result = new Uri(data);
      result._formatted = data.external ?? null;
      result._fsPath = data._sep === _pathSepMarker ? data.fsPath ?? null : null;
      return result;
    }
  }
  [/* @__PURE__ */ Symbol.for("debug.description")]() {
    return `URI(${this.toString()})`;
  }
};
function isUriComponents(thing) {
  if (!thing || typeof thing !== "object") {
    return false;
  }
  return typeof thing.scheme === "string" && (typeof thing.authority === "string" || typeof thing.authority === "undefined") && (typeof thing.path === "string" || typeof thing.path === "undefined") && (typeof thing.query === "string" || typeof thing.query === "undefined") && (typeof thing.fragment === "string" || typeof thing.fragment === "undefined");
}
__name(isUriComponents, "isUriComponents");
var _pathSepMarker = isWindows ? 1 : void 0;
var Uri = class extends URI {
  static {
    __name(this, "Uri");
  }
  constructor() {
    super(...arguments);
    this._formatted = null;
    this._fsPath = null;
  }
  get fsPath() {
    if (!this._fsPath) {
      this._fsPath = uriToFsPath(this, false);
    }
    return this._fsPath;
  }
  toString(skipEncoding = false) {
    if (!skipEncoding) {
      if (!this._formatted) {
        this._formatted = _asFormatted(this, false);
      }
      return this._formatted;
    } else {
      return _asFormatted(this, true);
    }
  }
  toJSON() {
    const res = {
      $mid: 1
      /* MarshalledId.Uri */
    };
    if (this._fsPath) {
      res.fsPath = this._fsPath;
      res._sep = _pathSepMarker;
    }
    if (this._formatted) {
      res.external = this._formatted;
    }
    if (this.path) {
      res.path = this.path;
    }
    if (this.scheme) {
      res.scheme = this.scheme;
    }
    if (this.authority) {
      res.authority = this.authority;
    }
    if (this.query) {
      res.query = this.query;
    }
    if (this.fragment) {
      res.fragment = this.fragment;
    }
    return res;
  }
};
var encodeTable = {
  [
    58
    /* CharCode.Colon */
  ]: "%3A",
  // gen-delims
  [
    47
    /* CharCode.Slash */
  ]: "%2F",
  [
    63
    /* CharCode.QuestionMark */
  ]: "%3F",
  [
    35
    /* CharCode.Hash */
  ]: "%23",
  [
    91
    /* CharCode.OpenSquareBracket */
  ]: "%5B",
  [
    93
    /* CharCode.CloseSquareBracket */
  ]: "%5D",
  [
    64
    /* CharCode.AtSign */
  ]: "%40",
  [
    33
    /* CharCode.ExclamationMark */
  ]: "%21",
  // sub-delims
  [
    36
    /* CharCode.DollarSign */
  ]: "%24",
  [
    38
    /* CharCode.Ampersand */
  ]: "%26",
  [
    39
    /* CharCode.SingleQuote */
  ]: "%27",
  [
    40
    /* CharCode.OpenParen */
  ]: "%28",
  [
    41
    /* CharCode.CloseParen */
  ]: "%29",
  [
    42
    /* CharCode.Asterisk */
  ]: "%2A",
  [
    43
    /* CharCode.Plus */
  ]: "%2B",
  [
    44
    /* CharCode.Comma */
  ]: "%2C",
  [
    59
    /* CharCode.Semicolon */
  ]: "%3B",
  [
    61
    /* CharCode.Equals */
  ]: "%3D",
  [
    32
    /* CharCode.Space */
  ]: "%20"
};
function encodeURIComponentFast(uriComponent, isPath, isAuthority) {
  let res = void 0;
  let nativeEncodePos = -1;
  for (let pos = 0; pos < uriComponent.length; pos++) {
    const code = uriComponent.charCodeAt(pos);
    if (code >= 97 && code <= 122 || code >= 65 && code <= 90 || code >= 48 && code <= 57 || code === 45 || code === 46 || code === 95 || code === 126 || isPath && code === 47 || isAuthority && code === 91 || isAuthority && code === 93 || isAuthority && code === 58) {
      if (nativeEncodePos !== -1) {
        res += encodeURIComponent(uriComponent.substring(nativeEncodePos, pos));
        nativeEncodePos = -1;
      }
      if (res !== void 0) {
        res += uriComponent.charAt(pos);
      }
    } else {
      if (res === void 0) {
        res = uriComponent.substr(0, pos);
      }
      const escaped = encodeTable[code];
      if (escaped !== void 0) {
        if (nativeEncodePos !== -1) {
          res += encodeURIComponent(uriComponent.substring(nativeEncodePos, pos));
          nativeEncodePos = -1;
        }
        res += escaped;
      } else if (nativeEncodePos === -1) {
        nativeEncodePos = pos;
      }
    }
  }
  if (nativeEncodePos !== -1) {
    res += encodeURIComponent(uriComponent.substring(nativeEncodePos));
  }
  return res !== void 0 ? res : uriComponent;
}
__name(encodeURIComponentFast, "encodeURIComponentFast");
function encodeURIComponentMinimal(path) {
  let res = void 0;
  for (let pos = 0; pos < path.length; pos++) {
    const code = path.charCodeAt(pos);
    if (code === 35 || code === 63) {
      if (res === void 0) {
        res = path.substr(0, pos);
      }
      res += encodeTable[code];
    } else {
      if (res !== void 0) {
        res += path[pos];
      }
    }
  }
  return res !== void 0 ? res : path;
}
__name(encodeURIComponentMinimal, "encodeURIComponentMinimal");
function uriToFsPath(uri, keepDriveLetterCasing) {
  let value;
  if (uri.authority && uri.path.length > 1 && uri.scheme === "file") {
    value = `//${uri.authority}${uri.path}`;
  } else if (uri.path.charCodeAt(0) === 47 && (uri.path.charCodeAt(1) >= 65 && uri.path.charCodeAt(1) <= 90 || uri.path.charCodeAt(1) >= 97 && uri.path.charCodeAt(1) <= 122) && uri.path.charCodeAt(2) === 58) {
    if (!keepDriveLetterCasing) {
      value = uri.path[1].toLowerCase() + uri.path.substr(2);
    } else {
      value = uri.path.substr(1);
    }
  } else {
    value = uri.path;
  }
  if (isWindows) {
    value = value.replace(/\//g, "\\");
  }
  return value;
}
__name(uriToFsPath, "uriToFsPath");
function _asFormatted(uri, skipEncoding) {
  const encoder = !skipEncoding ? encodeURIComponentFast : encodeURIComponentMinimal;
  let res = "";
  let { scheme, authority, path, query, fragment } = uri;
  if (scheme) {
    res += scheme;
    res += ":";
  }
  if (authority || scheme === "file") {
    res += _slash;
    res += _slash;
  }
  if (authority) {
    let idx = authority.indexOf("@");
    if (idx !== -1) {
      const userinfo = authority.substr(0, idx);
      authority = authority.substr(idx + 1);
      idx = userinfo.lastIndexOf(":");
      if (idx === -1) {
        res += encoder(userinfo, false, false);
      } else {
        res += encoder(userinfo.substr(0, idx), false, false);
        res += ":";
        res += encoder(userinfo.substr(idx + 1), false, true);
      }
      res += "@";
    }
    authority = authority.toLowerCase();
    idx = authority.lastIndexOf(":");
    if (idx === -1) {
      res += encoder(authority, false, true);
    } else {
      res += encoder(authority.substr(0, idx), false, true);
      res += authority.substr(idx);
    }
  }
  if (path) {
    if (path.length >= 3 && path.charCodeAt(0) === 47 && path.charCodeAt(2) === 58) {
      const code = path.charCodeAt(1);
      if (code >= 65 && code <= 90) {
        path = `/${String.fromCharCode(code + 32)}:${path.substr(3)}`;
      }
    } else if (path.length >= 2 && path.charCodeAt(1) === 58) {
      const code = path.charCodeAt(0);
      if (code >= 65 && code <= 90) {
        path = `${String.fromCharCode(code + 32)}:${path.substr(2)}`;
      }
    }
    res += encoder(path, true, false);
  }
  if (query) {
    res += "?";
    res += encoder(query, false, false);
  }
  if (fragment) {
    res += "#";
    res += !skipEncoding ? encodeURIComponentFast(fragment, false, false) : fragment;
  }
  return res;
}
__name(_asFormatted, "_asFormatted");
function decodeURIComponentGraceful(str) {
  try {
    return decodeURIComponent(str);
  } catch {
    if (str.length > 3) {
      return str.substr(0, 3) + decodeURIComponentGraceful(str.substr(3));
    } else {
      return str;
    }
  }
}
__name(decodeURIComponentGraceful, "decodeURIComponentGraceful");
var _rEncodedAsHex = /(%[0-9A-Za-z][0-9A-Za-z])+/g;
function percentDecode(str) {
  if (!str.match(_rEncodedAsHex)) {
    return str;
  }
  return str.replace(_rEncodedAsHex, (match) => decodeURIComponentGraceful(match));
}
__name(percentDecode, "percentDecode");

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/uuid.js
var _UUIDPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(value) {
  return _UUIDPattern.test(value);
}
__name(isUUID, "isUUID");
var generateUuid = (function() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID.bind(crypto);
  }
  const _data = new Uint8Array(16);
  const _hex = [];
  for (let i = 0; i < 256; i++) {
    _hex.push(i.toString(16).padStart(2, "0"));
  }
  return /* @__PURE__ */ __name(function generateUuid2() {
    crypto.getRandomValues(_data);
    _data[6] = _data[6] & 15 | 64;
    _data[8] = _data[8] & 63 | 128;
    let i = 0;
    let result = "";
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += "-";
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += "-";
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += "-";
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += "-";
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    return result;
  }, "generateUuid");
})();
function prefixedUuid(namespace) {
  return `${namespace}-${generateUuid()}`;
}
__name(prefixedUuid, "prefixedUuid");

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/platform/instantiation/common/instantiation.js
var _util;
(function(_util2) {
  _util2.serviceIds = /* @__PURE__ */ new Map();
  _util2.DI_TARGET = "$di$target";
  _util2.DI_DEPENDENCIES = "$di$dependencies";
  function getServiceDependencies(ctor) {
    return ctor[_util2.DI_DEPENDENCIES] || [];
  }
  __name(getServiceDependencies, "getServiceDependencies");
  _util2.getServiceDependencies = getServiceDependencies;
})(_util || (_util = {}));
var IInstantiationService = createDecorator("instantiationService");
function storeServiceDependency(id2, target, index2) {
  if (target[_util.DI_TARGET] === target) {
    target[_util.DI_DEPENDENCIES].push({ id: id2, index: index2 });
  } else {
    target[_util.DI_DEPENDENCIES] = [{ id: id2, index: index2 }];
    target[_util.DI_TARGET] = target;
  }
}
__name(storeServiceDependency, "storeServiceDependency");
function createDecorator(serviceId) {
  if (_util.serviceIds.has(serviceId)) {
    return _util.serviceIds.get(serviceId);
  }
  const id2 = /* @__PURE__ */ __name(function(target, key, index2) {
    if (arguments.length !== 3) {
      throw new Error("@IServiceName-decorator can only be used to decorate a parameter");
    }
    storeServiceDependency(id2, target, index2);
  }, "id");
  id2.toString = () => serviceId;
  _util.serviceIds.set(serviceId, id2);
  return id2;
}
__name(createDecorator, "createDecorator");
function refineServiceDecorator(serviceIdentifier) {
  return serviceIdentifier;
}
__name(refineServiceDecorator, "refineServiceDecorator");

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/network.js
var Schemas;
(function(Schemas2) {
  Schemas2.inMemory = "inmemory";
  Schemas2.vscode = "vscode";
  Schemas2.internal = "private";
  Schemas2.walkThrough = "walkThrough";
  Schemas2.walkThroughSnippet = "walkThroughSnippet";
  Schemas2.http = "http";
  Schemas2.https = "https";
  Schemas2.file = "file";
  Schemas2.mailto = "mailto";
  Schemas2.untitled = "untitled";
  Schemas2.data = "data";
  Schemas2.command = "command";
  Schemas2.vscodeRemote = "vscode-remote";
  Schemas2.vscodeRemoteResource = "vscode-remote-resource";
  Schemas2.vscodeManagedRemoteResource = "vscode-managed-remote-resource";
  Schemas2.vscodeUserData = "vscode-userdata";
  Schemas2.vscodeCustomEditor = "vscode-custom-editor";
  Schemas2.vscodeNotebookCell = "vscode-notebook-cell";
  Schemas2.vscodeNotebookCellMetadata = "vscode-notebook-cell-metadata";
  Schemas2.vscodeNotebookCellMetadataDiff = "vscode-notebook-cell-metadata-diff";
  Schemas2.vscodeNotebookCellOutput = "vscode-notebook-cell-output";
  Schemas2.vscodeNotebookCellOutputDiff = "vscode-notebook-cell-output-diff";
  Schemas2.vscodeNotebookMetadata = "vscode-notebook-metadata";
  Schemas2.vscodeInteractiveInput = "vscode-interactive-input";
  Schemas2.vscodeSettings = "vscode-settings";
  Schemas2.vscodeWorkspaceTrust = "vscode-workspace-trust";
  Schemas2.vscodeTerminal = "vscode-terminal";
  Schemas2.vscodeImageCarousel = "vscode-image-carousel";
  Schemas2.vscodeChatCodeBlock = "vscode-chat-code-block";
  Schemas2.vscodeChatCodeCompareBlock = "vscode-chat-code-compare-block";
  Schemas2.vscodeChatEditor = "vscode-chat-editor";
  Schemas2.vscodeChatInput = "chatSessionInput";
  Schemas2.vscodeLocalChatSession = "vscode-chat-session";
  Schemas2.webviewPanel = "webview-panel";
  Schemas2.vscodeWebview = "vscode-webview";
  Schemas2.vscodeBrowser = "vscode-browser";
  Schemas2.extension = "extension";
  Schemas2.vscodeFileResource = "vscode-file";
  Schemas2.tmp = "tmp";
  Schemas2.vsls = "vsls";
  Schemas2.vscodeSourceControl = "vscode-scm";
  Schemas2.commentsInput = "comment";
  Schemas2.codeSetting = "code-setting";
  Schemas2.outputChannel = "output";
  Schemas2.accessibleView = "accessible-view";
  Schemas2.chatEditingSnapshotScheme = "chat-editing-snapshot-text-model";
  Schemas2.chatEditingModel = "chat-editing-text-model";
  Schemas2.copilotPr = "copilot-pr";
})(Schemas || (Schemas = {}));
function matchesScheme(target, scheme) {
  if (URI.isUri(target)) {
    return equalsIgnoreCase(target.scheme, scheme);
  } else {
    return startsWithIgnoreCase(target, scheme + ":");
  }
}
__name(matchesScheme, "matchesScheme");
function matchesSomeScheme(target, ...schemes) {
  return schemes.some((scheme) => matchesScheme(target, scheme));
}
__name(matchesSomeScheme, "matchesSomeScheme");
var connectionTokenCookieName = "vscode-tkn";
var connectionTokenQueryName = "tkn";
var RemoteAuthoritiesImpl = class {
  static {
    __name(this, "RemoteAuthoritiesImpl");
  }
  constructor() {
    this._hosts = /* @__PURE__ */ Object.create(null);
    this._ports = /* @__PURE__ */ Object.create(null);
    this._connectionTokens = /* @__PURE__ */ Object.create(null);
    this._preferredWebSchema = "http";
    this._delegate = null;
    this._serverRootPath = "/";
  }
  setPreferredWebSchema(schema) {
    this._preferredWebSchema = schema;
  }
  setDelegate(delegate) {
    this._delegate = delegate;
  }
  setServerRootPath(product, serverBasePath) {
    this._serverRootPath = posix.join(serverBasePath ?? "/", getServerProductSegment(product));
  }
  getServerRootPath() {
    return this._serverRootPath;
  }
  get _remoteResourcesPath() {
    return posix.join(this._serverRootPath, Schemas.vscodeRemoteResource);
  }
  set(authority, host, port) {
    this._hosts[authority] = host;
    this._ports[authority] = port;
  }
  setConnectionToken(authority, connectionToken) {
    this._connectionTokens[authority] = connectionToken;
  }
  getPreferredWebSchema() {
    return this._preferredWebSchema;
  }
  rewrite(uri) {
    if (this._delegate) {
      try {
        return this._delegate(uri);
      } catch (err) {
        onUnexpectedError(err);
        return uri;
      }
    }
    const authority = uri.authority;
    let host = this._hosts[authority];
    if (host && host.indexOf(":") !== -1 && host.indexOf("[") === -1) {
      host = `[${host}]`;
    }
    const port = this._ports[authority];
    const connectionToken = this._connectionTokens[authority];
    let query = `path=${encodeURIComponent(uri.path)}`;
    if (typeof connectionToken === "string") {
      query += `&${connectionTokenQueryName}=${encodeURIComponent(connectionToken)}`;
    }
    return URI.from({
      scheme: isWeb ? this._preferredWebSchema : Schemas.vscodeRemoteResource,
      authority: `${host}:${port}`,
      path: this._remoteResourcesPath,
      query
    });
  }
};
var RemoteAuthorities = new RemoteAuthoritiesImpl();
function getServerProductSegment(product) {
  return `${product.quality ?? "oss"}-${product.commit ?? "dev"}`;
}
__name(getServerProductSegment, "getServerProductSegment");
var builtinExtensionsPath = "vs/../../extensions";
var nodeModulesPath = "vs/../../node_modules";
var nodeModulesAsarPath = "vs/../../node_modules.asar";
var nodeModulesAsarUnpackedPath = "vs/../../node_modules.asar.unpacked";
var VSCODE_AUTHORITY = "vscode-app";
var FileAccessImpl = class _FileAccessImpl {
  static {
    __name(this, "FileAccessImpl");
  }
  static {
    this.FALLBACK_AUTHORITY = VSCODE_AUTHORITY;
  }
  /**
   * Returns a URI to use in contexts where the browser is responsible
   * for loading (e.g. fetch()) or when used within the DOM.
   *
   * **Note:** use `dom.ts#asCSSUrl` whenever the URL is to be used in CSS context.
   */
  asBrowserUri(resourcePath) {
    const uri = this.toUri(resourcePath);
    return this.uriToBrowserUri(uri);
  }
  /**
   * Returns a URI to use in contexts where the browser is responsible
   * for loading (e.g. fetch()) or when used within the DOM.
   *
   * **Note:** use `dom.ts#asCSSUrl` whenever the URL is to be used in CSS context.
   */
  uriToBrowserUri(uri) {
    if (uri.scheme === Schemas.vscodeRemote) {
      return RemoteAuthorities.rewrite(uri);
    }
    if (
      // ...only ever for `file` resources
      uri.scheme === Schemas.file && // ...and we run in native environments
      (isNative || // ...or web worker extensions on desktop
      webWorkerOrigin === `${Schemas.vscodeFileResource}://${_FileAccessImpl.FALLBACK_AUTHORITY}`)
    ) {
      return uri.with({
        scheme: Schemas.vscodeFileResource,
        // We need to provide an authority here so that it can serve
        // as origin for network and loading matters in chromium.
        // If the URI is not coming with an authority already, we
        // add our own
        authority: uri.authority || _FileAccessImpl.FALLBACK_AUTHORITY,
        query: null,
        fragment: null
      });
    }
    return uri;
  }
  /**
   * Returns the `file` URI to use in contexts where node.js
   * is responsible for loading.
   */
  asFileUri(resourcePath) {
    const uri = this.toUri(resourcePath);
    return this.uriToFileUri(uri);
  }
  /**
   * Returns the `file` URI to use in contexts where node.js
   * is responsible for loading.
   */
  uriToFileUri(uri) {
    if (uri.scheme === Schemas.vscodeFileResource) {
      return uri.with({
        scheme: Schemas.file,
        // Only preserve the `authority` if it is different from
        // our fallback authority. This ensures we properly preserve
        // Windows UNC paths that come with their own authority.
        authority: uri.authority !== _FileAccessImpl.FALLBACK_AUTHORITY ? uri.authority : null,
        query: null,
        fragment: null
      });
    }
    return uri;
  }
  toUri(uriOrModule) {
    if (URI.isUri(uriOrModule)) {
      return uriOrModule;
    }
    if (globalThis._VSCODE_FILE_ROOT) {
      const rootUriOrPath = globalThis._VSCODE_FILE_ROOT;
      if (/^\w[\w\d+.-]*:\/\//.test(rootUriOrPath)) {
        return URI.joinPath(URI.parse(rootUriOrPath, true), uriOrModule);
      }
      const modulePath = join(rootUriOrPath, uriOrModule);
      return URI.file(modulePath);
    }
    throw new Error("Cannot determine URI for module id!");
  }
};
var FileAccess = new FileAccessImpl();
var CacheControlheaders = Object.freeze({
  "Cache-Control": "no-cache, no-store"
});
var DocumentPolicyheaders = Object.freeze({
  "Document-Policy": "include-js-call-stacks-in-crash-reports"
});
var COI;
(function(COI2) {
  const coiHeaders = /* @__PURE__ */ new Map([
    ["1", { "Cross-Origin-Opener-Policy": "same-origin" }],
    ["2", { "Cross-Origin-Embedder-Policy": "require-corp" }],
    ["3", { "Cross-Origin-Opener-Policy": "same-origin", "Cross-Origin-Embedder-Policy": "require-corp" }]
  ]);
  COI2.CoopAndCoep = Object.freeze(coiHeaders.get("3"));
  const coiSearchParamName = "vscode-coi";
  function getHeadersFromQuery(url) {
    let params;
    if (typeof url === "string") {
      params = new URL(url).searchParams;
    } else if (url instanceof URL) {
      params = url.searchParams;
    } else if (URI.isUri(url)) {
      params = new URL(url.toString(true)).searchParams;
    }
    const value = params?.get(coiSearchParamName);
    if (!value) {
      return void 0;
    }
    return coiHeaders.get(value);
  }
  __name(getHeadersFromQuery, "getHeadersFromQuery");
  COI2.getHeadersFromQuery = getHeadersFromQuery;
  function addSearchParam(urlOrSearch, coop, coep) {
    if (!globalThis.crossOriginIsolated) {
      return;
    }
    const value = coop && coep ? "3" : coep ? "2" : "1";
    if (urlOrSearch instanceof URLSearchParams) {
      urlOrSearch.set(coiSearchParamName, value);
    } else {
      urlOrSearch[coiSearchParamName] = value;
    }
  }
  __name(addSearchParam, "addSearchParam");
  COI2.addSearchParam = addSearchParam;
})(COI || (COI = {}));

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/platform/remote/common/remoteHosts.js
function getRemoteAuthority(uri) {
  return uri.scheme === Schemas.vscodeRemote ? uri.authority : void 0;
}
__name(getRemoteAuthority, "getRemoteAuthority");
function getRemoteName(authority) {
  if (!authority) {
    return void 0;
  }
  const pos = authority.indexOf("+");
  if (pos < 0) {
    return authority;
  }
  return authority.substr(0, pos);
}
__name(getRemoteName, "getRemoteName");
function getRemoteServerRootPath(authority) {
  if (!authority) {
    return void 0;
  }
  const pos = authority.indexOf("+");
  if (pos < 0) {
    return void 0;
  }
  return authority.substring(pos + 1);
}
__name(getRemoteServerRootPath, "getRemoteServerRootPath");
function parseAuthorityWithPort(authority) {
  const { host, port } = parseAuthority(authority);
  if (typeof port === "undefined") {
    throw new Error(`Invalid remote authority: ${authority}. It must either be a remote of form <remoteName>+<arg> or a remote host of form <host>:<port>.`);
  }
  return { host, port };
}
__name(parseAuthorityWithPort, "parseAuthorityWithPort");
function parseAuthorityWithOptionalPort(authority, defaultPort) {
  let { host, port } = parseAuthority(authority);
  if (typeof port === "undefined") {
    port = defaultPort;
  }
  return { host, port };
}
__name(parseAuthorityWithOptionalPort, "parseAuthorityWithOptionalPort");
function parseAuthority(authority) {
  const m1 = authority.match(/^(\[[0-9a-z:]+\]):(\d+)$/);
  if (m1) {
    return { host: m1[1], port: parseInt(m1[2], 10) };
  }
  const m2 = authority.match(/^(\[[0-9a-z:]+\])$/);
  if (m2) {
    return { host: m2[1], port: void 0 };
  }
  const m3 = authority.match(/(.*):(\d+)$/);
  if (m3) {
    return { host: m3[1], port: parseInt(m3[2], 10) };
  }
  return { host: authority, port: void 0 };
}
__name(parseAuthority, "parseAuthority");

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/platform/extensions/common/extensions.js
var USER_MANIFEST_CACHE_FILE = "extensions.user.cache";
var BUILTIN_MANIFEST_CACHE_FILE = "extensions.builtin.cache";
var UNDEFINED_PUBLISHER = "undefined_publisher";
var ALL_EXTENSION_KINDS = ["ui", "workspace", "web"];
function getWorkspaceSupportTypeMessage(supportType) {
  if (typeof supportType === "object" && supportType !== null) {
    if (supportType.supported !== true) {
      return supportType.description;
    }
  }
  return void 0;
}
__name(getWorkspaceSupportTypeMessage, "getWorkspaceSupportTypeMessage");
var EXTENSION_CATEGORIES = [
  "AI",
  "Azure",
  "Chat",
  "Data Science",
  "Debuggers",
  "Extension Packs",
  "Education",
  "Formatters",
  "Keymaps",
  "Language Packs",
  "Linters",
  "Machine Learning",
  "Notebooks",
  "Programming Languages",
  "SCM Providers",
  "Snippets",
  "Testing",
  "Themes",
  "Visualization",
  "Other"
];
var ExtensionType;
(function(ExtensionType2) {
  ExtensionType2[ExtensionType2["System"] = 0] = "System";
  ExtensionType2[ExtensionType2["User"] = 1] = "User";
})(ExtensionType || (ExtensionType = {}));
var TargetPlatform;
(function(TargetPlatform2) {
  TargetPlatform2["WIN32_X64"] = "win32-x64";
  TargetPlatform2["WIN32_ARM64"] = "win32-arm64";
  TargetPlatform2["LINUX_X64"] = "linux-x64";
  TargetPlatform2["LINUX_ARM64"] = "linux-arm64";
  TargetPlatform2["LINUX_ARMHF"] = "linux-armhf";
  TargetPlatform2["ALPINE_X64"] = "alpine-x64";
  TargetPlatform2["ALPINE_ARM64"] = "alpine-arm64";
  TargetPlatform2["DARWIN_X64"] = "darwin-x64";
  TargetPlatform2["DARWIN_ARM64"] = "darwin-arm64";
  TargetPlatform2["WEB"] = "web";
  TargetPlatform2["UNIVERSAL"] = "universal";
  TargetPlatform2["UNKNOWN"] = "unknown";
  TargetPlatform2["UNDEFINED"] = "undefined";
})(TargetPlatform || (TargetPlatform = {}));
var ExtensionIdentifier = class {
  static {
    __name(this, "ExtensionIdentifier");
  }
  constructor(value) {
    this.value = value;
    this._lower = value.toLowerCase();
  }
  static equals(a, b) {
    if (typeof a === "undefined" || a === null) {
      return typeof b === "undefined" || b === null;
    }
    if (typeof b === "undefined" || b === null) {
      return false;
    }
    if (typeof a === "string" || typeof b === "string") {
      const aValue = typeof a === "string" ? a : a.value;
      const bValue = typeof b === "string" ? b : b.value;
      return equalsIgnoreCase(aValue, bValue);
    }
    return a._lower === b._lower;
  }
  /**
   * Gives the value by which to index (for equality).
   */
  static toKey(id2) {
    if (typeof id2 === "string") {
      return id2.toLowerCase();
    }
    return id2._lower;
  }
};
var ExtensionIdentifierSet = class {
  static {
    __name(this, "ExtensionIdentifierSet");
  }
  get size() {
    return this._set.size;
  }
  constructor(iterable) {
    this._set = /* @__PURE__ */ new Set();
    if (iterable) {
      for (const value of iterable) {
        this.add(value);
      }
    }
  }
  add(id2) {
    this._set.add(ExtensionIdentifier.toKey(id2));
  }
  delete(extensionId) {
    return this._set.delete(ExtensionIdentifier.toKey(extensionId));
  }
  has(id2) {
    return this._set.has(ExtensionIdentifier.toKey(id2));
  }
};
var ExtensionIdentifierMap = class {
  static {
    __name(this, "ExtensionIdentifierMap");
  }
  constructor() {
    this._map = /* @__PURE__ */ new Map();
  }
  clear() {
    this._map.clear();
  }
  delete(id2) {
    this._map.delete(ExtensionIdentifier.toKey(id2));
  }
  get(id2) {
    return this._map.get(ExtensionIdentifier.toKey(id2));
  }
  has(id2) {
    return this._map.has(ExtensionIdentifier.toKey(id2));
  }
  set(id2, value) {
    this._map.set(ExtensionIdentifier.toKey(id2), value);
  }
  values() {
    return this._map.values();
  }
  forEach(callbackfn) {
    this._map.forEach(callbackfn);
  }
  [Symbol.iterator]() {
    return this._map[Symbol.iterator]();
  }
};
var ExtensionError = class extends Error {
  static {
    __name(this, "ExtensionError");
  }
  constructor(extensionIdentifier, cause, message) {
    super(`Error in extension ${ExtensionIdentifier.toKey(extensionIdentifier)}: ${message ?? cause.message}`, { cause });
    this.name = "ExtensionError";
    this.extension = extensionIdentifier;
  }
};
function isApplicationScopedExtension(manifest) {
  return isLanguagePackExtension(manifest);
}
__name(isApplicationScopedExtension, "isApplicationScopedExtension");
function isLanguagePackExtension(manifest) {
  return manifest.contributes && manifest.contributes.localizations ? manifest.contributes.localizations.length > 0 : false;
}
__name(isLanguagePackExtension, "isLanguagePackExtension");
function isAuthenticationProviderExtension(manifest) {
  return manifest.contributes && manifest.contributes.authentication ? manifest.contributes.authentication.length > 0 : false;
}
__name(isAuthenticationProviderExtension, "isAuthenticationProviderExtension");
function isResolverExtension(manifest, remoteAuthority) {
  if (remoteAuthority) {
    const activationEvent = `onResolveRemoteAuthority:${getRemoteName(remoteAuthority)}`;
    return !!manifest.activationEvents?.includes(activationEvent);
  }
  return false;
}
__name(isResolverExtension, "isResolverExtension");
function parseApiProposals(enabledApiProposals) {
  return enabledApiProposals.map((proposal) => {
    const [proposalName, version] = proposal.split("@");
    return { proposalName, version: version ? parseInt(version) : void 0 };
  });
}
__name(parseApiProposals, "parseApiProposals");
function parseEnabledApiProposalNames(enabledApiProposals) {
  return enabledApiProposals.map((proposal) => proposal.split("@")[0]);
}
__name(parseEnabledApiProposalNames, "parseEnabledApiProposalNames");
var IBuiltinExtensionsScannerService = createDecorator("IBuiltinExtensionsScannerService");

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/ternarySearchTree.js
var StringIterator = class {
  static {
    __name(this, "StringIterator");
  }
  constructor() {
    this._value = "";
    this._pos = 0;
  }
  reset(key) {
    this._value = key;
    this._pos = 0;
    return this;
  }
  next() {
    this._pos += 1;
    return this;
  }
  hasNext() {
    return this._pos < this._value.length - 1;
  }
  cmp(a) {
    const aCode = a.charCodeAt(0);
    const thisCode = this._value.charCodeAt(this._pos);
    return aCode - thisCode;
  }
  value() {
    return this._value[this._pos];
  }
};
var ConfigKeysIterator = class {
  static {
    __name(this, "ConfigKeysIterator");
  }
  constructor(_caseSensitive = true) {
    this._caseSensitive = _caseSensitive;
  }
  reset(key) {
    this._value = key;
    this._from = 0;
    this._to = 0;
    return this.next();
  }
  hasNext() {
    return this._to < this._value.length;
  }
  next() {
    this._from = this._to;
    let justSeps = true;
    for (; this._to < this._value.length; this._to++) {
      const ch = this._value.charCodeAt(this._to);
      if (ch === 46) {
        if (justSeps) {
          this._from++;
        } else {
          break;
        }
      } else {
        justSeps = false;
      }
    }
    return this;
  }
  cmp(a) {
    return this._caseSensitive ? compareSubstring(a, this._value, 0, a.length, this._from, this._to) : compareSubstringIgnoreCase(a, this._value, 0, a.length, this._from, this._to);
  }
  value() {
    return this._value.substring(this._from, this._to);
  }
};
var PathIterator = class {
  static {
    __name(this, "PathIterator");
  }
  constructor(_splitOnBackslash = true, _caseSensitive = true) {
    this._splitOnBackslash = _splitOnBackslash;
    this._caseSensitive = _caseSensitive;
  }
  reset(key) {
    this._from = 0;
    this._to = 0;
    this._value = key;
    this._valueLen = key.length;
    for (let pos = key.length - 1; pos >= 0; pos--, this._valueLen--) {
      const ch = this._value.charCodeAt(pos);
      if (!(ch === 47 || this._splitOnBackslash && ch === 92)) {
        break;
      }
    }
    return this.next();
  }
  hasNext() {
    return this._to < this._valueLen;
  }
  next() {
    this._from = this._to;
    let justSeps = true;
    for (; this._to < this._valueLen; this._to++) {
      const ch = this._value.charCodeAt(this._to);
      if (ch === 47 || this._splitOnBackslash && ch === 92) {
        if (justSeps) {
          this._from++;
        } else {
          break;
        }
      } else {
        justSeps = false;
      }
    }
    return this;
  }
  cmp(a) {
    return this._caseSensitive ? compareSubstring(a, this._value, 0, a.length, this._from, this._to) : compareSubstringIgnoreCase(a, this._value, 0, a.length, this._from, this._to);
  }
  value() {
    return this._value.substring(this._from, this._to);
  }
};
var UriIteratorState;
(function(UriIteratorState2) {
  UriIteratorState2[UriIteratorState2["Scheme"] = 1] = "Scheme";
  UriIteratorState2[UriIteratorState2["Authority"] = 2] = "Authority";
  UriIteratorState2[UriIteratorState2["Path"] = 3] = "Path";
  UriIteratorState2[UriIteratorState2["Query"] = 4] = "Query";
  UriIteratorState2[UriIteratorState2["Fragment"] = 5] = "Fragment";
})(UriIteratorState || (UriIteratorState = {}));
var UriIterator = class {
  static {
    __name(this, "UriIterator");
  }
  constructor(_ignorePathCasing, _ignoreQueryAndFragment) {
    this._ignorePathCasing = _ignorePathCasing;
    this._ignoreQueryAndFragment = _ignoreQueryAndFragment;
    this._states = [];
    this._stateIdx = 0;
  }
  reset(key) {
    this._value = key;
    this._states = [];
    if (this._value.scheme) {
      this._states.push(
        1
        /* UriIteratorState.Scheme */
      );
    }
    if (this._value.authority) {
      this._states.push(
        2
        /* UriIteratorState.Authority */
      );
    }
    if (this._value.path) {
      this._pathIterator = new PathIterator(false, !this._ignorePathCasing(key));
      this._pathIterator.reset(key.path);
      if (this._pathIterator.value()) {
        this._states.push(
          3
          /* UriIteratorState.Path */
        );
      }
    }
    if (!this._ignoreQueryAndFragment(key)) {
      if (this._value.query) {
        this._states.push(
          4
          /* UriIteratorState.Query */
        );
      }
      if (this._value.fragment) {
        this._states.push(
          5
          /* UriIteratorState.Fragment */
        );
      }
    }
    this._stateIdx = 0;
    return this;
  }
  next() {
    if (this._states[this._stateIdx] === 3 && this._pathIterator.hasNext()) {
      this._pathIterator.next();
    } else {
      this._stateIdx += 1;
    }
    return this;
  }
  hasNext() {
    return this._states[this._stateIdx] === 3 && this._pathIterator.hasNext() || this._stateIdx < this._states.length - 1;
  }
  cmp(a) {
    if (this._states[this._stateIdx] === 1) {
      return compareIgnoreCase(a, this._value.scheme);
    } else if (this._states[this._stateIdx] === 2) {
      return compareIgnoreCase(a, this._value.authority);
    } else if (this._states[this._stateIdx] === 3) {
      return this._pathIterator.cmp(a);
    } else if (this._states[this._stateIdx] === 4) {
      return compare(a, this._value.query);
    } else if (this._states[this._stateIdx] === 5) {
      return compare(a, this._value.fragment);
    }
    throw new Error();
  }
  value() {
    if (this._states[this._stateIdx] === 1) {
      return this._value.scheme;
    } else if (this._states[this._stateIdx] === 2) {
      return this._value.authority;
    } else if (this._states[this._stateIdx] === 3) {
      return this._pathIterator.value();
    } else if (this._states[this._stateIdx] === 4) {
      return this._value.query;
    } else if (this._states[this._stateIdx] === 5) {
      return this._value.fragment;
    }
    throw new Error();
  }
};
var Undef = class _Undef {
  static {
    __name(this, "Undef");
  }
  static {
    this.Val = /* @__PURE__ */ Symbol("undefined_placeholder");
  }
  static wrap(value) {
    return value === void 0 ? _Undef.Val : value;
  }
  static unwrap(value) {
    return value === _Undef.Val ? void 0 : value;
  }
};
var TernarySearchTreeNode = class {
  static {
    __name(this, "TernarySearchTreeNode");
  }
  constructor() {
    this.height = 1;
    this.value = void 0;
    this.key = void 0;
    this.left = void 0;
    this.mid = void 0;
    this.right = void 0;
  }
  isEmpty() {
    return !this.left && !this.mid && !this.right && this.value === void 0;
  }
  rotateLeft() {
    const tmp = this.right;
    this.right = tmp.left;
    tmp.left = this;
    this.updateHeight();
    tmp.updateHeight();
    return tmp;
  }
  rotateRight() {
    const tmp = this.left;
    this.left = tmp.right;
    tmp.right = this;
    this.updateHeight();
    tmp.updateHeight();
    return tmp;
  }
  updateHeight() {
    this.height = 1 + Math.max(this.heightLeft, this.heightRight);
  }
  balanceFactor() {
    return this.heightRight - this.heightLeft;
  }
  get heightLeft() {
    return this.left?.height ?? 0;
  }
  get heightRight() {
    return this.right?.height ?? 0;
  }
};
var Dir;
(function(Dir2) {
  Dir2[Dir2["Left"] = -1] = "Left";
  Dir2[Dir2["Mid"] = 0] = "Mid";
  Dir2[Dir2["Right"] = 1] = "Right";
})(Dir || (Dir = {}));
var TernarySearchTree = class _TernarySearchTree {
  static {
    __name(this, "TernarySearchTree");
  }
  static forUris(ignorePathCasing = () => false, ignoreQueryAndFragment = () => false) {
    return new _TernarySearchTree(new UriIterator(ignorePathCasing, ignoreQueryAndFragment));
  }
  static forPaths(ignorePathCasing = false) {
    return new _TernarySearchTree(new PathIterator(void 0, !ignorePathCasing));
  }
  static forStrings() {
    return new _TernarySearchTree(new StringIterator());
  }
  static forConfigKeys() {
    return new _TernarySearchTree(new ConfigKeysIterator());
  }
  constructor(segments) {
    this._iter = segments;
  }
  clear() {
    this._root = void 0;
  }
  fill(values, keys) {
    if (keys) {
      const arr = keys.slice(0);
      shuffle(arr);
      for (const k of arr) {
        this.set(k, values);
      }
    } else {
      const arr = values.slice(0);
      shuffle(arr);
      for (const entry of arr) {
        this.set(entry[0], entry[1]);
      }
    }
  }
  set(key, element) {
    const iter = this._iter.reset(key);
    let node;
    if (!this._root) {
      this._root = new TernarySearchTreeNode();
      this._root.segment = iter.value();
    }
    const stack = [];
    node = this._root;
    while (true) {
      const val = iter.cmp(node.segment);
      if (val > 0) {
        if (!node.left) {
          node.left = new TernarySearchTreeNode();
          node.left.segment = iter.value();
        }
        stack.push([-1, node]);
        node = node.left;
      } else if (val < 0) {
        if (!node.right) {
          node.right = new TernarySearchTreeNode();
          node.right.segment = iter.value();
        }
        stack.push([1, node]);
        node = node.right;
      } else if (iter.hasNext()) {
        iter.next();
        if (!node.mid) {
          node.mid = new TernarySearchTreeNode();
          node.mid.segment = iter.value();
        }
        stack.push([0, node]);
        node = node.mid;
      } else {
        break;
      }
    }
    const oldElement = Undef.unwrap(node.value);
    node.value = Undef.wrap(element);
    node.key = key;
    for (let i = stack.length - 1; i >= 0; i--) {
      const node2 = stack[i][1];
      node2.updateHeight();
      const bf = node2.balanceFactor();
      if (bf < -1 || bf > 1) {
        const d1 = stack[i][0];
        const d2 = stack[i + 1][0];
        if (d1 === 1 && d2 === 1) {
          stack[i][1] = node2.rotateLeft();
        } else if (d1 === -1 && d2 === -1) {
          stack[i][1] = node2.rotateRight();
        } else if (d1 === 1 && d2 === -1) {
          node2.right = stack[i + 1][1] = stack[i + 1][1].rotateRight();
          stack[i][1] = node2.rotateLeft();
        } else if (d1 === -1 && d2 === 1) {
          node2.left = stack[i + 1][1] = stack[i + 1][1].rotateLeft();
          stack[i][1] = node2.rotateRight();
        } else {
          throw new Error();
        }
        if (i > 0) {
          switch (stack[i - 1][0]) {
            case -1:
              stack[i - 1][1].left = stack[i][1];
              break;
            case 1:
              stack[i - 1][1].right = stack[i][1];
              break;
            case 0:
              stack[i - 1][1].mid = stack[i][1];
              break;
          }
        } else {
          this._root = stack[0][1];
        }
      }
    }
    return oldElement;
  }
  get(key) {
    return Undef.unwrap(this._getNode(key)?.value);
  }
  _getNode(key) {
    const iter = this._iter.reset(key);
    let node = this._root;
    while (node) {
      const val = iter.cmp(node.segment);
      if (val > 0) {
        node = node.left;
      } else if (val < 0) {
        node = node.right;
      } else if (iter.hasNext()) {
        iter.next();
        node = node.mid;
      } else {
        break;
      }
    }
    return node;
  }
  has(key) {
    const node = this._getNode(key);
    return !(node?.value === void 0 && node?.mid === void 0);
  }
  delete(key) {
    return this._delete(key, false);
  }
  deleteSuperstr(key) {
    return this._delete(key, true);
  }
  _delete(key, superStr) {
    const iter = this._iter.reset(key);
    const stack = [];
    let node = this._root;
    while (node) {
      const val = iter.cmp(node.segment);
      if (val > 0) {
        stack.push([-1, node]);
        node = node.left;
      } else if (val < 0) {
        stack.push([1, node]);
        node = node.right;
      } else if (iter.hasNext()) {
        iter.next();
        stack.push([0, node]);
        node = node.mid;
      } else {
        break;
      }
    }
    if (!node) {
      return;
    }
    if (superStr) {
      node.left = void 0;
      node.mid = void 0;
      node.right = void 0;
      node.height = 1;
    } else {
      node.key = void 0;
      node.value = void 0;
    }
    if (!node.mid && !node.value) {
      if (node.left && node.right) {
        const stack2 = [[1, node]];
        const min = this._min(node.right, stack2);
        if (min.key) {
          node.key = min.key;
          node.value = min.value;
          node.segment = min.segment;
          const newChild = min.right;
          if (stack2.length > 1) {
            const [dir, parent] = stack2[stack2.length - 1];
            switch (dir) {
              case -1:
                parent.left = newChild;
                break;
              case 0:
                assert(false);
              case 1:
                assert(false);
            }
          } else {
            node.right = newChild;
          }
          const newChild2 = this._balanceByStack(stack2);
          if (stack.length > 0) {
            const [dir, parent] = stack[stack.length - 1];
            switch (dir) {
              case -1:
                parent.left = newChild2;
                break;
              case 0:
                parent.mid = newChild2;
                break;
              case 1:
                parent.right = newChild2;
                break;
            }
          } else {
            this._root = newChild2;
          }
        }
      } else {
        const newChild = node.left ?? node.right;
        if (stack.length > 0) {
          const [dir, parent] = stack[stack.length - 1];
          switch (dir) {
            case -1:
              parent.left = newChild;
              break;
            case 0:
              parent.mid = newChild;
              break;
            case 1:
              parent.right = newChild;
              break;
          }
        } else {
          this._root = newChild;
        }
      }
    }
    this._root = this._balanceByStack(stack) ?? this._root;
  }
  _min(node, stack) {
    while (node.left) {
      stack.push([-1, node]);
      node = node.left;
    }
    return node;
  }
  _balanceByStack(stack) {
    for (let i = stack.length - 1; i >= 0; i--) {
      const node = stack[i][1];
      node.updateHeight();
      const bf = node.balanceFactor();
      if (bf > 1) {
        if (node.right.balanceFactor() >= 0) {
          stack[i][1] = node.rotateLeft();
        } else {
          node.right = node.right.rotateRight();
          stack[i][1] = node.rotateLeft();
        }
      } else if (bf < -1) {
        if (node.left.balanceFactor() <= 0) {
          stack[i][1] = node.rotateRight();
        } else {
          node.left = node.left.rotateLeft();
          stack[i][1] = node.rotateRight();
        }
      }
      if (i > 0) {
        switch (stack[i - 1][0]) {
          case -1:
            stack[i - 1][1].left = stack[i][1];
            break;
          case 1:
            stack[i - 1][1].right = stack[i][1];
            break;
          case 0:
            stack[i - 1][1].mid = stack[i][1];
            break;
        }
      } else {
        return stack[0][1];
      }
    }
    return void 0;
  }
  findSubstr(key) {
    const iter = this._iter.reset(key);
    let node = this._root;
    let candidate = void 0;
    while (node) {
      const val = iter.cmp(node.segment);
      if (val > 0) {
        node = node.left;
      } else if (val < 0) {
        node = node.right;
      } else if (iter.hasNext()) {
        iter.next();
        candidate = Undef.unwrap(node.value) || candidate;
        node = node.mid;
      } else {
        break;
      }
    }
    return node && Undef.unwrap(node.value) || candidate;
  }
  findSuperstr(key) {
    return this._findSuperstrOrElement(key, false);
  }
  _findSuperstrOrElement(key, allowValue) {
    const iter = this._iter.reset(key);
    let node = this._root;
    while (node) {
      const val = iter.cmp(node.segment);
      if (val > 0) {
        node = node.left;
      } else if (val < 0) {
        node = node.right;
      } else if (iter.hasNext()) {
        iter.next();
        node = node.mid;
      } else {
        if (!node.mid) {
          if (allowValue) {
            return Undef.unwrap(node.value);
          } else {
            return void 0;
          }
        } else {
          return this._entries(node.mid);
        }
      }
    }
    return void 0;
  }
  hasElementOrSubtree(key) {
    return this._findSuperstrOrElement(key, true) !== void 0;
  }
  forEach(callback) {
    for (const [key, value] of this) {
      callback(value, key);
    }
  }
  *[Symbol.iterator]() {
    yield* this._entries(this._root);
  }
  _entries(node) {
    const result = [];
    this._dfsEntries(node, result);
    return result[Symbol.iterator]();
  }
  _dfsEntries(node, bucket) {
    if (!node) {
      return;
    }
    if (node.left) {
      this._dfsEntries(node.left, bucket);
    }
    if (node.value !== void 0) {
      bucket.push([node.key, Undef.unwrap(node.value)]);
    }
    if (node.mid) {
      this._dfsEntries(node.mid, bucket);
    }
    if (node.right) {
      this._dfsEntries(node.right, bucket);
    }
  }
  // for debug/testing
  _isBalanced() {
    const nodeIsBalanced = /* @__PURE__ */ __name((node) => {
      if (!node) {
        return true;
      }
      const bf = node.balanceFactor();
      if (bf < -1 || bf > 1) {
        return false;
      }
      return nodeIsBalanced(node.left) && nodeIsBalanced(node.right);
    }, "nodeIsBalanced");
    return nodeIsBalanced(this._root);
  }
};

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/platform/files/common/files.js
var IFileService = createDecorator("fileService");
function isFileOpenForWriteOptions(options) {
  return options.create === true;
}
__name(isFileOpenForWriteOptions, "isFileOpenForWriteOptions");
var FileType;
(function(FileType2) {
  FileType2[FileType2["Unknown"] = 0] = "Unknown";
  FileType2[FileType2["File"] = 1] = "File";
  FileType2[FileType2["Directory"] = 2] = "Directory";
  FileType2[FileType2["SymbolicLink"] = 64] = "SymbolicLink";
})(FileType || (FileType = {}));
var FilePermission;
(function(FilePermission2) {
  FilePermission2[FilePermission2["Readonly"] = 1] = "Readonly";
  FilePermission2[FilePermission2["Locked"] = 2] = "Locked";
  FilePermission2[FilePermission2["Executable"] = 4] = "Executable";
})(FilePermission || (FilePermission = {}));
var FileChangeFilter;
(function(FileChangeFilter2) {
  FileChangeFilter2[FileChangeFilter2["UPDATED"] = 2] = "UPDATED";
  FileChangeFilter2[FileChangeFilter2["ADDED"] = 4] = "ADDED";
  FileChangeFilter2[FileChangeFilter2["DELETED"] = 8] = "DELETED";
})(FileChangeFilter || (FileChangeFilter = {}));
function isFileSystemWatcher(thing) {
  const candidate = thing;
  return !!candidate && typeof candidate.onDidChange === "function";
}
__name(isFileSystemWatcher, "isFileSystemWatcher");
var FileSystemProviderCapabilities;
(function(FileSystemProviderCapabilities2) {
  FileSystemProviderCapabilities2[FileSystemProviderCapabilities2["None"] = 0] = "None";
  FileSystemProviderCapabilities2[FileSystemProviderCapabilities2["FileReadWrite"] = 2] = "FileReadWrite";
  FileSystemProviderCapabilities2[FileSystemProviderCapabilities2["FileOpenReadWriteClose"] = 4] = "FileOpenReadWriteClose";
  FileSystemProviderCapabilities2[FileSystemProviderCapabilities2["FileReadStream"] = 16] = "FileReadStream";
  FileSystemProviderCapabilities2[FileSystemProviderCapabilities2["FileFolderCopy"] = 8] = "FileFolderCopy";
  FileSystemProviderCapabilities2[FileSystemProviderCapabilities2["PathCaseSensitive"] = 1024] = "PathCaseSensitive";
  FileSystemProviderCapabilities2[FileSystemProviderCapabilities2["Readonly"] = 2048] = "Readonly";
  FileSystemProviderCapabilities2[FileSystemProviderCapabilities2["Trash"] = 4096] = "Trash";
  FileSystemProviderCapabilities2[FileSystemProviderCapabilities2["FileWriteUnlock"] = 8192] = "FileWriteUnlock";
  FileSystemProviderCapabilities2[FileSystemProviderCapabilities2["FileAtomicRead"] = 16384] = "FileAtomicRead";
  FileSystemProviderCapabilities2[FileSystemProviderCapabilities2["FileAtomicWrite"] = 32768] = "FileAtomicWrite";
  FileSystemProviderCapabilities2[FileSystemProviderCapabilities2["FileAtomicDelete"] = 65536] = "FileAtomicDelete";
  FileSystemProviderCapabilities2[FileSystemProviderCapabilities2["FileClone"] = 131072] = "FileClone";
  FileSystemProviderCapabilities2[FileSystemProviderCapabilities2["FileRealpath"] = 262144] = "FileRealpath";
  FileSystemProviderCapabilities2[FileSystemProviderCapabilities2["FileAppend"] = 524288] = "FileAppend";
})(FileSystemProviderCapabilities || (FileSystemProviderCapabilities = {}));
function hasReadWriteCapability(provider) {
  return !!(provider.capabilities & 2);
}
__name(hasReadWriteCapability, "hasReadWriteCapability");
function hasFileAppendCapability(provider) {
  return !!(provider.capabilities & 524288);
}
__name(hasFileAppendCapability, "hasFileAppendCapability");
function hasFileFolderCopyCapability(provider) {
  return !!(provider.capabilities & 8);
}
__name(hasFileFolderCopyCapability, "hasFileFolderCopyCapability");
function hasFileCloneCapability(provider) {
  return !!(provider.capabilities & 131072);
}
__name(hasFileCloneCapability, "hasFileCloneCapability");
function hasFileRealpathCapability(provider) {
  return !!(provider.capabilities & 262144);
}
__name(hasFileRealpathCapability, "hasFileRealpathCapability");
function hasOpenReadWriteCloseCapability(provider) {
  return !!(provider.capabilities & 4);
}
__name(hasOpenReadWriteCloseCapability, "hasOpenReadWriteCloseCapability");
function hasFileReadStreamCapability(provider) {
  return !!(provider.capabilities & 16);
}
__name(hasFileReadStreamCapability, "hasFileReadStreamCapability");
function hasFileAtomicReadCapability(provider) {
  if (!hasReadWriteCapability(provider)) {
    return false;
  }
  return !!(provider.capabilities & 16384);
}
__name(hasFileAtomicReadCapability, "hasFileAtomicReadCapability");
function hasFileAtomicWriteCapability(provider) {
  if (!hasReadWriteCapability(provider)) {
    return false;
  }
  return !!(provider.capabilities & 32768);
}
__name(hasFileAtomicWriteCapability, "hasFileAtomicWriteCapability");
function hasFileAtomicDeleteCapability(provider) {
  return !!(provider.capabilities & 65536);
}
__name(hasFileAtomicDeleteCapability, "hasFileAtomicDeleteCapability");
function hasReadonlyCapability(provider) {
  return !!(provider.capabilities & 2048);
}
__name(hasReadonlyCapability, "hasReadonlyCapability");
var FileSystemProviderErrorCode;
(function(FileSystemProviderErrorCode2) {
  FileSystemProviderErrorCode2["FileExists"] = "EntryExists";
  FileSystemProviderErrorCode2["FileNotFound"] = "EntryNotFound";
  FileSystemProviderErrorCode2["FileNotADirectory"] = "EntryNotADirectory";
  FileSystemProviderErrorCode2["FileIsADirectory"] = "EntryIsADirectory";
  FileSystemProviderErrorCode2["FileExceedsStorageQuota"] = "EntryExceedsStorageQuota";
  FileSystemProviderErrorCode2["FileTooLarge"] = "EntryTooLarge";
  FileSystemProviderErrorCode2["FileWriteLocked"] = "EntryWriteLocked";
  FileSystemProviderErrorCode2["NoPermissions"] = "NoPermissions";
  FileSystemProviderErrorCode2["Unavailable"] = "Unavailable";
  FileSystemProviderErrorCode2["Unknown"] = "Unknown";
})(FileSystemProviderErrorCode || (FileSystemProviderErrorCode = {}));
var FileSystemProviderError = class _FileSystemProviderError extends Error {
  static {
    __name(this, "FileSystemProviderError");
  }
  static create(error, code) {
    const providerError = new _FileSystemProviderError(error.toString(), code);
    markAsFileSystemProviderError(providerError, code);
    return providerError;
  }
  constructor(message, code) {
    super(message);
    this.code = code;
  }
};
function createFileSystemProviderError(error, code) {
  return FileSystemProviderError.create(error, code);
}
__name(createFileSystemProviderError, "createFileSystemProviderError");
function ensureFileSystemProviderError(error) {
  if (!error) {
    return createFileSystemProviderError(localize("unknownError", "Unknown Error"), FileSystemProviderErrorCode.Unknown);
  }
  return error;
}
__name(ensureFileSystemProviderError, "ensureFileSystemProviderError");
function markAsFileSystemProviderError(error, code) {
  error.name = code ? `${code} (FileSystemError)` : `FileSystemError`;
  return error;
}
__name(markAsFileSystemProviderError, "markAsFileSystemProviderError");
function toFileSystemProviderErrorCode(error) {
  if (!error) {
    return FileSystemProviderErrorCode.Unknown;
  }
  if (error instanceof FileSystemProviderError) {
    return error.code;
  }
  const match = /^(.+) \(FileSystemError\)$/.exec(error.name);
  if (!match) {
    return FileSystemProviderErrorCode.Unknown;
  }
  switch (match[1]) {
    case FileSystemProviderErrorCode.FileExists:
      return FileSystemProviderErrorCode.FileExists;
    case FileSystemProviderErrorCode.FileIsADirectory:
      return FileSystemProviderErrorCode.FileIsADirectory;
    case FileSystemProviderErrorCode.FileNotADirectory:
      return FileSystemProviderErrorCode.FileNotADirectory;
    case FileSystemProviderErrorCode.FileNotFound:
      return FileSystemProviderErrorCode.FileNotFound;
    case FileSystemProviderErrorCode.FileTooLarge:
      return FileSystemProviderErrorCode.FileTooLarge;
    case FileSystemProviderErrorCode.FileWriteLocked:
      return FileSystemProviderErrorCode.FileWriteLocked;
    case FileSystemProviderErrorCode.NoPermissions:
      return FileSystemProviderErrorCode.NoPermissions;
    case FileSystemProviderErrorCode.Unavailable:
      return FileSystemProviderErrorCode.Unavailable;
  }
  return FileSystemProviderErrorCode.Unknown;
}
__name(toFileSystemProviderErrorCode, "toFileSystemProviderErrorCode");
function toFileOperationResult(error) {
  if (error instanceof FileOperationError) {
    return error.fileOperationResult;
  }
  switch (toFileSystemProviderErrorCode(error)) {
    case FileSystemProviderErrorCode.FileNotFound:
      return 1;
    case FileSystemProviderErrorCode.FileIsADirectory:
      return 0;
    case FileSystemProviderErrorCode.FileNotADirectory:
      return 9;
    case FileSystemProviderErrorCode.FileWriteLocked:
      return 5;
    case FileSystemProviderErrorCode.NoPermissions:
      return 6;
    case FileSystemProviderErrorCode.FileExists:
      return 4;
    case FileSystemProviderErrorCode.FileTooLarge:
      return 7;
    default:
      return 10;
  }
}
__name(toFileOperationResult, "toFileOperationResult");
var FileOperation;
(function(FileOperation2) {
  FileOperation2[FileOperation2["CREATE"] = 0] = "CREATE";
  FileOperation2[FileOperation2["DELETE"] = 1] = "DELETE";
  FileOperation2[FileOperation2["MOVE"] = 2] = "MOVE";
  FileOperation2[FileOperation2["COPY"] = 3] = "COPY";
  FileOperation2[FileOperation2["WRITE"] = 4] = "WRITE";
})(FileOperation || (FileOperation = {}));
var FileOperationEvent = class {
  static {
    __name(this, "FileOperationEvent");
  }
  constructor(resource, operation, target) {
    this.resource = resource;
    this.operation = operation;
    this.target = target;
  }
  isOperation(operation) {
    return this.operation === operation;
  }
};
var FileChangeType;
(function(FileChangeType3) {
  FileChangeType3[FileChangeType3["UPDATED"] = 0] = "UPDATED";
  FileChangeType3[FileChangeType3["ADDED"] = 1] = "ADDED";
  FileChangeType3[FileChangeType3["DELETED"] = 2] = "DELETED";
})(FileChangeType || (FileChangeType = {}));
var FileChangesEvent = class _FileChangesEvent {
  static {
    __name(this, "FileChangesEvent");
  }
  static {
    this.MIXED_CORRELATION = null;
  }
  constructor(changes, ignorePathCasing) {
    this.ignorePathCasing = ignorePathCasing;
    this.correlationId = void 0;
    this.added = new Lazy(() => {
      const added = TernarySearchTree.forUris(() => this.ignorePathCasing);
      added.fill(this.rawAdded.map((resource) => [resource, true]));
      return added;
    });
    this.updated = new Lazy(() => {
      const updated = TernarySearchTree.forUris(() => this.ignorePathCasing);
      updated.fill(this.rawUpdated.map((resource) => [resource, true]));
      return updated;
    });
    this.deleted = new Lazy(() => {
      const deleted = TernarySearchTree.forUris(() => this.ignorePathCasing);
      deleted.fill(this.rawDeleted.map((resource) => [resource, true]));
      return deleted;
    });
    this.rawAdded = [];
    this.rawUpdated = [];
    this.rawDeleted = [];
    for (const change of changes) {
      switch (change.type) {
        case 1:
          this.rawAdded.push(change.resource);
          break;
        case 0:
          this.rawUpdated.push(change.resource);
          break;
        case 2:
          this.rawDeleted.push(change.resource);
          break;
      }
      if (this.correlationId !== _FileChangesEvent.MIXED_CORRELATION) {
        if (typeof change.cId === "number") {
          if (this.correlationId === void 0) {
            this.correlationId = change.cId;
          } else if (this.correlationId !== change.cId) {
            this.correlationId = _FileChangesEvent.MIXED_CORRELATION;
          }
        } else {
          if (this.correlationId !== void 0) {
            this.correlationId = _FileChangesEvent.MIXED_CORRELATION;
          }
        }
      }
    }
  }
  /**
   * Find out if the file change events match the provided resource.
   *
   * Note: when passing `FileChangeType.DELETED`, we consider a match
   * also when the parent of the resource got deleted.
   */
  contains(resource, ...types) {
    return this.doContains(resource, { includeChildren: false }, ...types);
  }
  /**
   * Find out if the file change events either match the provided
   * resource, or contain a child of this resource.
   */
  affects(resource, ...types) {
    return this.doContains(resource, { includeChildren: true }, ...types);
  }
  doContains(resource, options, ...types) {
    if (!resource) {
      return false;
    }
    const hasTypesFilter = types.length > 0;
    if (!hasTypesFilter || types.includes(
      1
      /* FileChangeType.ADDED */
    )) {
      if (this.added.value.get(resource)) {
        return true;
      }
      if (options.includeChildren && this.added.value.findSuperstr(resource)) {
        return true;
      }
    }
    if (!hasTypesFilter || types.includes(
      0
      /* FileChangeType.UPDATED */
    )) {
      if (this.updated.value.get(resource)) {
        return true;
      }
      if (options.includeChildren && this.updated.value.findSuperstr(resource)) {
        return true;
      }
    }
    if (!hasTypesFilter || types.includes(
      2
      /* FileChangeType.DELETED */
    )) {
      if (this.deleted.value.findSubstr(resource)) {
        return true;
      }
      if (options.includeChildren && this.deleted.value.findSuperstr(resource)) {
        return true;
      }
    }
    return false;
  }
  /**
   * Returns if this event contains added files.
   */
  gotAdded() {
    return this.rawAdded.length > 0;
  }
  /**
   * Returns if this event contains deleted files.
   */
  gotDeleted() {
    return this.rawDeleted.length > 0;
  }
  /**
   * Returns if this event contains updated files.
   */
  gotUpdated() {
    return this.rawUpdated.length > 0;
  }
  /**
   * Returns if this event contains changes that correlate to the
   * provided `correlationId`.
   *
   * File change event correlation is an advanced watch feature that
   * allows to  identify from which watch request the events originate
   * from. This correlation allows to route events specifically
   * only to the requestor and not emit them to all listeners.
   */
  correlates(correlationId) {
    return this.correlationId === correlationId;
  }
  /**
   * Figure out if the event contains changes that correlate to one
   * correlation identifier.
   *
   * File change event correlation is an advanced watch feature that
   * allows to  identify from which watch request the events originate
   * from. This correlation allows to route events specifically
   * only to the requestor and not emit them to all listeners.
   */
  hasCorrelation() {
    return typeof this.correlationId === "number";
  }
};
function isParent(path, candidate, ignoreCase) {
  if (!path || !candidate || path === candidate) {
    return false;
  }
  if (candidate.length > path.length) {
    return false;
  }
  if (candidate.charAt(candidate.length - 1) !== sep) {
    candidate += sep;
  }
  if (ignoreCase) {
    return startsWithIgnoreCase(path, candidate);
  }
  return path.indexOf(candidate) === 0;
}
__name(isParent, "isParent");
var FileOperationError = class extends Error {
  static {
    __name(this, "FileOperationError");
  }
  constructor(message, fileOperationResult, options) {
    super(message);
    this.fileOperationResult = fileOperationResult;
    this.options = options;
  }
};
var TooLargeFileOperationError = class extends FileOperationError {
  static {
    __name(this, "TooLargeFileOperationError");
  }
  constructor(message, fileOperationResult, size, options) {
    super(message, fileOperationResult, options);
    this.fileOperationResult = fileOperationResult;
    this.size = size;
  }
};
var NotModifiedSinceFileOperationError = class extends FileOperationError {
  static {
    __name(this, "NotModifiedSinceFileOperationError");
  }
  constructor(message, stat, options) {
    super(message, 2, options);
    this.stat = stat;
  }
};
var FileOperationResult;
(function(FileOperationResult2) {
  FileOperationResult2[FileOperationResult2["FILE_IS_DIRECTORY"] = 0] = "FILE_IS_DIRECTORY";
  FileOperationResult2[FileOperationResult2["FILE_NOT_FOUND"] = 1] = "FILE_NOT_FOUND";
  FileOperationResult2[FileOperationResult2["FILE_NOT_MODIFIED_SINCE"] = 2] = "FILE_NOT_MODIFIED_SINCE";
  FileOperationResult2[FileOperationResult2["FILE_MODIFIED_SINCE"] = 3] = "FILE_MODIFIED_SINCE";
  FileOperationResult2[FileOperationResult2["FILE_MOVE_CONFLICT"] = 4] = "FILE_MOVE_CONFLICT";
  FileOperationResult2[FileOperationResult2["FILE_WRITE_LOCKED"] = 5] = "FILE_WRITE_LOCKED";
  FileOperationResult2[FileOperationResult2["FILE_PERMISSION_DENIED"] = 6] = "FILE_PERMISSION_DENIED";
  FileOperationResult2[FileOperationResult2["FILE_TOO_LARGE"] = 7] = "FILE_TOO_LARGE";
  FileOperationResult2[FileOperationResult2["FILE_INVALID_PATH"] = 8] = "FILE_INVALID_PATH";
  FileOperationResult2[FileOperationResult2["FILE_NOT_DIRECTORY"] = 9] = "FILE_NOT_DIRECTORY";
  FileOperationResult2[FileOperationResult2["FILE_OTHER_ERROR"] = 10] = "FILE_OTHER_ERROR";
})(FileOperationResult || (FileOperationResult = {}));
var AutoSaveConfiguration = {
  OFF: "off",
  AFTER_DELAY: "afterDelay",
  ON_FOCUS_CHANGE: "onFocusChange",
  ON_WINDOW_CHANGE: "onWindowChange"
};
var HotExitConfiguration = {
  OFF: "off",
  ON_EXIT: "onExit",
  ON_EXIT_AND_WINDOW_CLOSE: "onExitAndWindowClose"
};
var FILES_ASSOCIATIONS_CONFIG = "files.associations";
var FILES_EXCLUDE_CONFIG = "files.exclude";
var FILES_READONLY_INCLUDE_CONFIG = "files.readonlyInclude";
var FILES_READONLY_EXCLUDE_CONFIG = "files.readonlyExclude";
var FILES_READONLY_FROM_PERMISSIONS_CONFIG = "files.readonlyFromPermissions";
var FileKind;
(function(FileKind2) {
  FileKind2[FileKind2["FILE"] = 0] = "FILE";
  FileKind2[FileKind2["FOLDER"] = 1] = "FOLDER";
  FileKind2[FileKind2["ROOT_FOLDER"] = 2] = "ROOT_FOLDER";
})(FileKind || (FileKind = {}));
var ETAG_DISABLED = "";
function etag(stat) {
  if (typeof stat.size !== "number" || typeof stat.mtime !== "number") {
    return void 0;
  }
  return stat.mtime.toString(29) + stat.size.toString(31);
}
__name(etag, "etag");
async function whenProviderRegistered(file, fileService) {
  if (fileService.hasProvider(URI.from({ scheme: file.scheme }))) {
    return;
  }
  return new Promise((resolve2) => {
    const disposable = fileService.onDidChangeFileSystemProviderRegistrations((e) => {
      if (e.scheme === file.scheme && e.added) {
        disposable.dispose();
        resolve2();
      }
    });
  });
}
__name(whenProviderRegistered, "whenProviderRegistered");
var ByteSize = class _ByteSize {
  static {
    __name(this, "ByteSize");
  }
  static {
    this.KB = 1024;
  }
  static {
    this.MB = _ByteSize.KB * _ByteSize.KB;
  }
  static {
    this.GB = _ByteSize.MB * _ByteSize.KB;
  }
  static {
    this.TB = _ByteSize.GB * _ByteSize.KB;
  }
  static formatSize(size) {
    if (!isNumber(size)) {
      size = 0;
    }
    if (size < _ByteSize.KB) {
      return localize("sizeB", "{0}B", size.toFixed(0));
    }
    if (size < _ByteSize.MB) {
      return localize("sizeKB", "{0}KB", (size / _ByteSize.KB).toFixed(2));
    }
    if (size < _ByteSize.GB) {
      return localize("sizeMB", "{0}MB", (size / _ByteSize.MB).toFixed(2));
    }
    if (size < _ByteSize.TB) {
      return localize("sizeGB", "{0}GB", (size / _ByteSize.GB).toFixed(2));
    }
    return localize("sizeTB", "{0}TB", (size / _ByteSize.TB).toFixed(2));
  }
};
function getLargeFileConfirmationLimit(arg) {
  const isRemote = typeof arg === "string" || arg?.scheme === Schemas.vscodeRemote;
  const isLocal = typeof arg !== "string" && arg?.scheme === Schemas.file;
  if (isLocal) {
    return 1024 * ByteSize.MB;
  }
  if (isRemote) {
    return 10 * ByteSize.MB;
  }
  if (isWeb) {
    return 50 * ByteSize.MB;
  }
  return 1024 * ByteSize.MB;
}
__name(getLargeFileConfirmationLimit, "getLargeFileConfirmationLimit");

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/platform/remote/common/remoteAuthorityResolver.js
var IRemoteAuthorityResolverService = createDecorator("remoteAuthorityResolverService");
var RemoteConnectionType;
(function(RemoteConnectionType2) {
  RemoteConnectionType2[RemoteConnectionType2["WebSocket"] = 0] = "WebSocket";
  RemoteConnectionType2[RemoteConnectionType2["Managed"] = 1] = "Managed";
})(RemoteConnectionType || (RemoteConnectionType = {}));
var ManagedRemoteConnection = class {
  static {
    __name(this, "ManagedRemoteConnection");
  }
  constructor(id2) {
    this.id = id2;
    this.type = 1;
  }
  toString() {
    return `Managed(${this.id})`;
  }
};
var WebSocketRemoteConnection = class {
  static {
    __name(this, "WebSocketRemoteConnection");
  }
  constructor(host, port) {
    this.host = host;
    this.port = port;
    this.type = 0;
  }
  toString() {
    return `WebSocket(${this.host}:${this.port})`;
  }
};
var RemoteAuthorityResolverErrorCode;
(function(RemoteAuthorityResolverErrorCode2) {
  RemoteAuthorityResolverErrorCode2["Unknown"] = "Unknown";
  RemoteAuthorityResolverErrorCode2["NotAvailable"] = "NotAvailable";
  RemoteAuthorityResolverErrorCode2["TemporarilyNotAvailable"] = "TemporarilyNotAvailable";
  RemoteAuthorityResolverErrorCode2["NoResolverFound"] = "NoResolverFound";
  RemoteAuthorityResolverErrorCode2["InvalidAuthority"] = "InvalidAuthority";
})(RemoteAuthorityResolverErrorCode || (RemoteAuthorityResolverErrorCode = {}));
var RemoteAuthorityResolverError = class _RemoteAuthorityResolverError extends ErrorNoTelemetry {
  static {
    __name(this, "RemoteAuthorityResolverError");
  }
  static isNotAvailable(err) {
    return err instanceof _RemoteAuthorityResolverError && err._code === RemoteAuthorityResolverErrorCode.NotAvailable;
  }
  static isTemporarilyNotAvailable(err) {
    return err instanceof _RemoteAuthorityResolverError && err._code === RemoteAuthorityResolverErrorCode.TemporarilyNotAvailable;
  }
  static isNoResolverFound(err) {
    return err instanceof _RemoteAuthorityResolverError && err._code === RemoteAuthorityResolverErrorCode.NoResolverFound;
  }
  static isInvalidAuthority(err) {
    return err instanceof _RemoteAuthorityResolverError && err._code === RemoteAuthorityResolverErrorCode.InvalidAuthority;
  }
  static isHandled(err) {
    return err instanceof _RemoteAuthorityResolverError && err.isHandled;
  }
  constructor(message, code = RemoteAuthorityResolverErrorCode.Unknown, detail) {
    super(message);
    this._message = message;
    this._code = code;
    this._detail = detail;
    this.isHandled = code === RemoteAuthorityResolverErrorCode.NotAvailable && detail === true;
    Object.setPrototypeOf(this, _RemoteAuthorityResolverError.prototype);
  }
};
function getRemoteAuthorityPrefix(remoteAuthority) {
  const plusIndex = remoteAuthority.indexOf("+");
  if (plusIndex === -1) {
    return remoteAuthority;
  }
  return remoteAuthority.substring(0, plusIndex);
}
__name(getRemoteAuthorityPrefix, "getRemoteAuthorityPrefix");

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/workbench/api/common/extHostTypes/es5ClassCompat.js
function es5ClassCompat(target) {
  const interceptFunctions = {
    apply: /* @__PURE__ */ __name(function(...args) {
      if (args.length === 0) {
        return Reflect.construct(target, []);
      } else {
        const argsList = args.length === 1 ? [] : args[1];
        return Reflect.construct(target, argsList, args[0].constructor);
      }
    }, "apply"),
    call: /* @__PURE__ */ __name(function(...args) {
      if (args.length === 0) {
        return Reflect.construct(target, []);
      } else {
        const [thisArg, ...restArgs] = args;
        return Reflect.construct(target, restArgs, thisArg.constructor);
      }
    }, "call")
  };
  return Object.assign(target, interceptFunctions);
}
__name(es5ClassCompat, "es5ClassCompat");

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/naturalLanguage/korean.js
function getKoreanAltChars(code) {
  const result = disassembleKorean(code);
  if (result && result.length > 0) {
    return new Uint32Array(result);
  }
  return void 0;
}
__name(getKoreanAltChars, "getKoreanAltChars");
var codeBufferLength = 0;
var codeBuffer = new Uint32Array(10);
function disassembleKorean(code) {
  codeBufferLength = 0;
  getCodesFromArray(
    code,
    modernConsonants,
    4352
    /* HangulRangeStartCode.InitialConsonant */
  );
  if (codeBufferLength > 0) {
    return codeBuffer.subarray(0, codeBufferLength);
  }
  getCodesFromArray(
    code,
    modernVowels,
    4449
    /* HangulRangeStartCode.Vowel */
  );
  if (codeBufferLength > 0) {
    return codeBuffer.subarray(0, codeBufferLength);
  }
  getCodesFromArray(
    code,
    modernFinalConsonants,
    4520
    /* HangulRangeStartCode.FinalConsonant */
  );
  if (codeBufferLength > 0) {
    return codeBuffer.subarray(0, codeBufferLength);
  }
  getCodesFromArray(
    code,
    compatibilityJamo,
    12593
    /* HangulRangeStartCode.CompatibilityJamo */
  );
  if (codeBufferLength) {
    return codeBuffer.subarray(0, codeBufferLength);
  }
  if (code >= 44032 && code <= 55203) {
    const hangulIndex = code - 44032;
    const vowelAndFinalConsonantProduct = hangulIndex % 588;
    const initialConsonantIndex = Math.floor(hangulIndex / 588);
    const vowelIndex = Math.floor(vowelAndFinalConsonantProduct / 28);
    const finalConsonantIndex = vowelAndFinalConsonantProduct % 28 - 1;
    if (initialConsonantIndex < modernConsonants.length) {
      getCodesFromArray(initialConsonantIndex, modernConsonants, 0);
    } else if (4352 + initialConsonantIndex - 12593 < compatibilityJamo.length) {
      getCodesFromArray(
        4352 + initialConsonantIndex,
        compatibilityJamo,
        12593
        /* HangulRangeStartCode.CompatibilityJamo */
      );
    }
    if (vowelIndex < modernVowels.length) {
      getCodesFromArray(vowelIndex, modernVowels, 0);
    } else if (4449 + vowelIndex - 12593 < compatibilityJamo.length) {
      getCodesFromArray(
        4449 + vowelIndex - 12593,
        compatibilityJamo,
        12593
        /* HangulRangeStartCode.CompatibilityJamo */
      );
    }
    if (finalConsonantIndex >= 0) {
      if (finalConsonantIndex < modernFinalConsonants.length) {
        getCodesFromArray(finalConsonantIndex, modernFinalConsonants, 0);
      } else if (4520 + finalConsonantIndex - 12593 < compatibilityJamo.length) {
        getCodesFromArray(
          4520 + finalConsonantIndex - 12593,
          compatibilityJamo,
          12593
          /* HangulRangeStartCode.CompatibilityJamo */
        );
      }
    }
    if (codeBufferLength > 0) {
      return codeBuffer.subarray(0, codeBufferLength);
    }
  }
  return void 0;
}
__name(disassembleKorean, "disassembleKorean");
function getCodesFromArray(code, array, arrayStartIndex) {
  if (code >= arrayStartIndex && code < arrayStartIndex + array.length) {
    addCodesToBuffer(array[code - arrayStartIndex]);
  }
}
__name(getCodesFromArray, "getCodesFromArray");
function addCodesToBuffer(codes) {
  if (codes === 0) {
    return;
  }
  codeBuffer[codeBufferLength++] = codes & 255;
  if (codes >> 8) {
    codeBuffer[codeBufferLength++] = codes >> 8 & 255;
  }
  if (codes >> 16) {
    codeBuffer[codeBufferLength++] = codes >> 16 & 255;
  }
}
__name(addCodesToBuffer, "addCodesToBuffer");
var HangulRangeStartCode;
(function(HangulRangeStartCode2) {
  HangulRangeStartCode2[HangulRangeStartCode2["InitialConsonant"] = 4352] = "InitialConsonant";
  HangulRangeStartCode2[HangulRangeStartCode2["Vowel"] = 4449] = "Vowel";
  HangulRangeStartCode2[HangulRangeStartCode2["FinalConsonant"] = 4520] = "FinalConsonant";
  HangulRangeStartCode2[HangulRangeStartCode2["CompatibilityJamo"] = 12593] = "CompatibilityJamo";
})(HangulRangeStartCode || (HangulRangeStartCode = {}));
var AsciiCode;
(function(AsciiCode2) {
  AsciiCode2[AsciiCode2["NUL"] = 0] = "NUL";
  AsciiCode2[AsciiCode2["A"] = 65] = "A";
  AsciiCode2[AsciiCode2["B"] = 66] = "B";
  AsciiCode2[AsciiCode2["C"] = 67] = "C";
  AsciiCode2[AsciiCode2["D"] = 68] = "D";
  AsciiCode2[AsciiCode2["E"] = 69] = "E";
  AsciiCode2[AsciiCode2["F"] = 70] = "F";
  AsciiCode2[AsciiCode2["G"] = 71] = "G";
  AsciiCode2[AsciiCode2["H"] = 72] = "H";
  AsciiCode2[AsciiCode2["I"] = 73] = "I";
  AsciiCode2[AsciiCode2["J"] = 74] = "J";
  AsciiCode2[AsciiCode2["K"] = 75] = "K";
  AsciiCode2[AsciiCode2["L"] = 76] = "L";
  AsciiCode2[AsciiCode2["M"] = 77] = "M";
  AsciiCode2[AsciiCode2["N"] = 78] = "N";
  AsciiCode2[AsciiCode2["O"] = 79] = "O";
  AsciiCode2[AsciiCode2["P"] = 80] = "P";
  AsciiCode2[AsciiCode2["Q"] = 81] = "Q";
  AsciiCode2[AsciiCode2["R"] = 82] = "R";
  AsciiCode2[AsciiCode2["S"] = 83] = "S";
  AsciiCode2[AsciiCode2["T"] = 84] = "T";
  AsciiCode2[AsciiCode2["U"] = 85] = "U";
  AsciiCode2[AsciiCode2["V"] = 86] = "V";
  AsciiCode2[AsciiCode2["W"] = 87] = "W";
  AsciiCode2[AsciiCode2["X"] = 88] = "X";
  AsciiCode2[AsciiCode2["Y"] = 89] = "Y";
  AsciiCode2[AsciiCode2["Z"] = 90] = "Z";
  AsciiCode2[AsciiCode2["a"] = 97] = "a";
  AsciiCode2[AsciiCode2["b"] = 98] = "b";
  AsciiCode2[AsciiCode2["c"] = 99] = "c";
  AsciiCode2[AsciiCode2["d"] = 100] = "d";
  AsciiCode2[AsciiCode2["e"] = 101] = "e";
  AsciiCode2[AsciiCode2["f"] = 102] = "f";
  AsciiCode2[AsciiCode2["g"] = 103] = "g";
  AsciiCode2[AsciiCode2["h"] = 104] = "h";
  AsciiCode2[AsciiCode2["i"] = 105] = "i";
  AsciiCode2[AsciiCode2["j"] = 106] = "j";
  AsciiCode2[AsciiCode2["k"] = 107] = "k";
  AsciiCode2[AsciiCode2["l"] = 108] = "l";
  AsciiCode2[AsciiCode2["m"] = 109] = "m";
  AsciiCode2[AsciiCode2["n"] = 110] = "n";
  AsciiCode2[AsciiCode2["o"] = 111] = "o";
  AsciiCode2[AsciiCode2["p"] = 112] = "p";
  AsciiCode2[AsciiCode2["q"] = 113] = "q";
  AsciiCode2[AsciiCode2["r"] = 114] = "r";
  AsciiCode2[AsciiCode2["s"] = 115] = "s";
  AsciiCode2[AsciiCode2["t"] = 116] = "t";
  AsciiCode2[AsciiCode2["u"] = 117] = "u";
  AsciiCode2[AsciiCode2["v"] = 118] = "v";
  AsciiCode2[AsciiCode2["w"] = 119] = "w";
  AsciiCode2[AsciiCode2["x"] = 120] = "x";
  AsciiCode2[AsciiCode2["y"] = 121] = "y";
  AsciiCode2[AsciiCode2["z"] = 122] = "z";
})(AsciiCode || (AsciiCode = {}));
var AsciiCodeCombo;
(function(AsciiCodeCombo2) {
  AsciiCodeCombo2[AsciiCodeCombo2["fa"] = 24934] = "fa";
  AsciiCodeCombo2[AsciiCodeCombo2["fg"] = 26470] = "fg";
  AsciiCodeCombo2[AsciiCodeCombo2["fq"] = 29030] = "fq";
  AsciiCodeCombo2[AsciiCodeCombo2["fr"] = 29286] = "fr";
  AsciiCodeCombo2[AsciiCodeCombo2["ft"] = 29798] = "ft";
  AsciiCodeCombo2[AsciiCodeCombo2["fv"] = 30310] = "fv";
  AsciiCodeCombo2[AsciiCodeCombo2["fx"] = 30822] = "fx";
  AsciiCodeCombo2[AsciiCodeCombo2["hk"] = 27496] = "hk";
  AsciiCodeCombo2[AsciiCodeCombo2["hl"] = 27752] = "hl";
  AsciiCodeCombo2[AsciiCodeCombo2["ho"] = 28520] = "ho";
  AsciiCodeCombo2[AsciiCodeCombo2["ml"] = 27757] = "ml";
  AsciiCodeCombo2[AsciiCodeCombo2["nj"] = 27246] = "nj";
  AsciiCodeCombo2[AsciiCodeCombo2["nl"] = 27758] = "nl";
  AsciiCodeCombo2[AsciiCodeCombo2["np"] = 28782] = "np";
  AsciiCodeCombo2[AsciiCodeCombo2["qt"] = 29809] = "qt";
  AsciiCodeCombo2[AsciiCodeCombo2["rt"] = 29810] = "rt";
  AsciiCodeCombo2[AsciiCodeCombo2["sg"] = 26483] = "sg";
  AsciiCodeCombo2[AsciiCodeCombo2["sw"] = 30579] = "sw";
})(AsciiCodeCombo || (AsciiCodeCombo = {}));
var modernConsonants = new Uint8Array([
  114,
  // ㄱ
  82,
  // ㄲ
  115,
  // ㄴ
  101,
  // ㄷ
  69,
  // ㄸ
  102,
  // ㄹ
  97,
  // ㅁ
  113,
  // ㅂ
  81,
  // ㅃ
  116,
  // ㅅ
  84,
  // ㅆ
  100,
  // ㅇ
  119,
  // ㅈ
  87,
  // ㅉ
  99,
  // ㅊ
  122,
  // ㅋ
  120,
  // ㅌ
  118,
  // ㅍ
  103
  // ㅎ
]);
var modernVowels = new Uint16Array([
  107,
  //  -> ㅏ
  111,
  //  -> ㅐ
  105,
  //  -> ㅑ
  79,
  //  -> ㅒ
  106,
  //  -> ㅓ
  112,
  //  -> ㅔ
  117,
  //  -> ㅕ
  80,
  //  -> ㅖ
  104,
  //  -> ㅗ
  27496,
  //  -> ㅘ
  28520,
  //  -> ㅙ
  27752,
  //  -> ㅚ
  121,
  //  -> ㅛ
  110,
  //  -> ㅜ
  27246,
  //  -> ㅝ
  28782,
  //  -> ㅞ
  27758,
  //  -> ㅟ
  98,
  //  -> ㅠ
  109,
  //  -> ㅡ
  27757,
  //  -> ㅢ
  108
  //  -> ㅣ
]);
var modernFinalConsonants = new Uint16Array([
  114,
  // ㄱ
  82,
  // ㄲ
  29810,
  // ㄳ
  115,
  // ㄴ
  30579,
  // ㄵ
  26483,
  // ㄶ
  101,
  // ㄷ
  102,
  // ㄹ
  29286,
  // ㄺ
  24934,
  // ㄻ
  29030,
  // ㄼ
  29798,
  // ㄽ
  30822,
  // ㄾ
  30310,
  // ㄿ
  26470,
  // ㅀ
  97,
  // ㅁ
  113,
  // ㅂ
  29809,
  // ㅄ
  116,
  // ㅅ
  84,
  // ㅆ
  100,
  // ㅇ
  119,
  // ㅈ
  99,
  // ㅊ
  122,
  // ㅋ
  120,
  // ㅌ
  118,
  // ㅍ
  103
  // ㅎ
]);
var compatibilityJamo = new Uint16Array([
  114,
  // ㄱ
  82,
  // ㄲ
  29810,
  // ㄳ
  115,
  // ㄴ
  30579,
  // ㄵ
  26483,
  // ㄶ
  101,
  // ㄷ
  69,
  // ㄸ
  102,
  // ㄹ
  29286,
  // ㄺ
  24934,
  // ㄻ
  29030,
  // ㄼ
  29798,
  // ㄽ
  30822,
  // ㄾ
  30310,
  // ㄿ
  26470,
  // ㅀ
  97,
  // ㅁ
  113,
  // ㅂ
  81,
  // ㅃ
  29809,
  // ㅄ
  116,
  // ㅅ
  84,
  // ㅆ
  100,
  // ㅇ
  119,
  // ㅈ
  87,
  // ㅉ
  99,
  // ㅊ
  122,
  // ㅋ
  120,
  // ㅌ
  118,
  // ㅍ
  103,
  // ㅎ
  107,
  // ㅏ
  111,
  // ㅐ
  105,
  // ㅑ
  79,
  // ㅒ
  106,
  // ㅓ
  112,
  // ㅔ
  117,
  // ㅕ
  80,
  // ㅖ
  104,
  // ㅗ
  27496,
  // ㅘ
  28520,
  // ㅙ
  27752,
  // ㅚ
  121,
  // ㅛ
  110,
  // ㅜ
  27246,
  // ㅝ
  28782,
  // ㅞ
  27758,
  // ㅟ
  98,
  // ㅠ
  109,
  // ㅡ
  27757,
  // ㅢ
  108
  // ㅣ
  // HF: Hangul Filler (everything after this is archaic)
  // ㅥ
  // ㅦ
  // ㅧ
  // ㅨ
  // ㅩ
  // ㅪ
  // ㅫ
  // ㅬ
  // ㅮ
  // ㅯ
  // ㅰ
  // ㅱ
  // ㅲ
  // ㅳ
  // ㅴ
  // ㅵ
  // ㅶ
  // ㅷ
  // ㅸ
  // ㅹ
  // ㅺ
  // ㅻ
  // ㅼ
  // ㅽ
  // ㅾ
  // ㅿ
  // ㆀ
  // ㆁ
  // ㆂ
  // ㆃ
  // ㆄ
  // ㆅ
  // ㆆ
  // ㆇ
  // ㆈ
  // ㆉ
  // ㆊ
  // ㆋ
  // ㆌ
  // ㆍ
  // ㆎ
]);

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/normalization.js
var nfcCache = new LRUCache(1e4);
function normalizeNFC(str) {
  return normalize2(str, "NFC", nfcCache);
}
__name(normalizeNFC, "normalizeNFC");
var nfdCache = new LRUCache(1e4);
function normalizeNFD(str) {
  return normalize2(str, "NFD", nfdCache);
}
__name(normalizeNFD, "normalizeNFD");
var nonAsciiCharactersPattern = /[^\u0000-\u0080]/;
function normalize2(str, form, normalizedCache) {
  if (!str) {
    return str;
  }
  const cached = normalizedCache.get(str);
  if (cached) {
    return cached;
  }
  let res;
  if (nonAsciiCharactersPattern.test(str)) {
    res = str.normalize(form);
  } else {
    res = str;
  }
  normalizedCache.set(str, res);
  return res;
}
__name(normalize2, "normalize");
var tryNormalizeToBase = (function() {
  const cache = new LRUCache(1e4);
  const accentsRegex = /[\u0300-\u036f]/g;
  return function(str) {
    const cached = cache.get(str);
    if (cached) {
      return cached;
    }
    const noAccents = normalizeNFD(str).replace(accentsRegex, "");
    const result = (noAccents.length === str.length ? noAccents : str).toLowerCase();
    cache.set(str, result);
    return result;
  };
})();

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/filters.js
function or(...filter) {
  return function(word, wordToMatchAgainst) {
    for (let i = 0, len = filter.length; i < len; i++) {
      const match = filter[i](word, wordToMatchAgainst);
      if (match) {
        return match;
      }
    }
    return null;
  };
}
__name(or, "or");
var matchesStrictPrefix = _matchesPrefix.bind(void 0, false);
var matchesPrefix = _matchesPrefix.bind(void 0, true);
function _matchesPrefix(ignoreCase, word, wordToMatchAgainst) {
  if (!wordToMatchAgainst || wordToMatchAgainst.length < word.length) {
    return null;
  }
  let matches;
  if (ignoreCase) {
    matches = startsWithIgnoreCase(wordToMatchAgainst, word);
  } else {
    matches = wordToMatchAgainst.indexOf(word) === 0;
  }
  if (!matches) {
    return null;
  }
  return word.length > 0 ? [{ start: 0, end: word.length }] : [];
}
__name(_matchesPrefix, "_matchesPrefix");
function matchesContiguousSubString(word, wordToMatchAgainst) {
  if (word.length > wordToMatchAgainst.length) {
    return null;
  }
  const index2 = wordToMatchAgainst.toLowerCase().indexOf(word.toLowerCase());
  if (index2 === -1) {
    return null;
  }
  return [{ start: index2, end: index2 + word.length }];
}
__name(matchesContiguousSubString, "matchesContiguousSubString");
function matchesBaseContiguousSubString(word, wordToMatchAgainst) {
  if (word.length > wordToMatchAgainst.length) {
    return null;
  }
  word = tryNormalizeToBase(word);
  wordToMatchAgainst = tryNormalizeToBase(wordToMatchAgainst);
  const index2 = wordToMatchAgainst.indexOf(word);
  if (index2 === -1) {
    return null;
  }
  return [{ start: index2, end: index2 + word.length }];
}
__name(matchesBaseContiguousSubString, "matchesBaseContiguousSubString");
function matchesSubString(word, wordToMatchAgainst) {
  if (word.length > wordToMatchAgainst.length) {
    return null;
  }
  return _matchesSubString(word.toLowerCase(), wordToMatchAgainst.toLowerCase(), 0, 0);
}
__name(matchesSubString, "matchesSubString");
function _matchesSubString(word, wordToMatchAgainst, i, j) {
  if (i === word.length) {
    return [];
  } else if (j === wordToMatchAgainst.length) {
    return null;
  } else {
    if (word[i] === wordToMatchAgainst[j]) {
      let result = null;
      if (result = _matchesSubString(word, wordToMatchAgainst, i + 1, j + 1)) {
        return join2({ start: j, end: j + 1 }, result);
      }
      return null;
    }
    return _matchesSubString(word, wordToMatchAgainst, i, j + 1);
  }
}
__name(_matchesSubString, "_matchesSubString");
function isLower(code) {
  return 97 <= code && code <= 122;
}
__name(isLower, "isLower");
function isUpper(code) {
  return 65 <= code && code <= 90;
}
__name(isUpper, "isUpper");
function isNumber2(code) {
  return 48 <= code && code <= 57;
}
__name(isNumber2, "isNumber");
function isWhitespace(code) {
  return code === 32 || code === 9 || code === 10 || code === 13;
}
__name(isWhitespace, "isWhitespace");
var wordSeparators = /* @__PURE__ */ new Set();
"()[]{}<>`'\"-/;:,.?!".split("").forEach((s) => wordSeparators.add(s.charCodeAt(0)));
function isWordSeparator(code) {
  return isWhitespace(code) || wordSeparators.has(code);
}
__name(isWordSeparator, "isWordSeparator");
function charactersMatch(codeA, codeB) {
  return codeA === codeB || isWordSeparator(codeA) && isWordSeparator(codeB);
}
__name(charactersMatch, "charactersMatch");
var alternateCharsCache = /* @__PURE__ */ new Map();
function getAlternateCodes(code) {
  if (alternateCharsCache.has(code)) {
    return alternateCharsCache.get(code);
  }
  let result;
  const codes = getKoreanAltChars(code);
  if (codes) {
    result = codes;
  }
  alternateCharsCache.set(code, result);
  return result;
}
__name(getAlternateCodes, "getAlternateCodes");
function isAlphanumeric(code) {
  return isLower(code) || isUpper(code) || isNumber2(code);
}
__name(isAlphanumeric, "isAlphanumeric");
function join2(head, tail2) {
  if (tail2.length === 0) {
    tail2 = [head];
  } else if (head.end === tail2[0].start) {
    tail2[0].start = head.start;
  } else {
    tail2.unshift(head);
  }
  return tail2;
}
__name(join2, "join");
function nextAnchor(camelCaseWord, start) {
  for (let i = start; i < camelCaseWord.length; i++) {
    const c = camelCaseWord.charCodeAt(i);
    if (isUpper(c) || isNumber2(c) || i > 0 && !isAlphanumeric(camelCaseWord.charCodeAt(i - 1))) {
      return i;
    }
  }
  return camelCaseWord.length;
}
__name(nextAnchor, "nextAnchor");
function _matchesCamelCase(word, camelCaseWord, i, j) {
  if (i === word.length) {
    return [];
  } else if (j === camelCaseWord.length) {
    return null;
  } else if (word[i] !== camelCaseWord[j].toLowerCase()) {
    return null;
  } else {
    let result = null;
    let nextUpperIndex = j + 1;
    result = _matchesCamelCase(word, camelCaseWord, i + 1, j + 1);
    while (!result && (nextUpperIndex = nextAnchor(camelCaseWord, nextUpperIndex)) < camelCaseWord.length) {
      result = _matchesCamelCase(word, camelCaseWord, i + 1, nextUpperIndex);
      nextUpperIndex++;
    }
    return result === null ? null : join2({ start: j, end: j + 1 }, result);
  }
}
__name(_matchesCamelCase, "_matchesCamelCase");
function analyzeCamelCaseWord(word) {
  let upper = 0, lower = 0, alpha = 0, numeric = 0, code = 0;
  for (let i = 0; i < word.length; i++) {
    code = word.charCodeAt(i);
    if (isUpper(code)) {
      upper++;
    }
    if (isLower(code)) {
      lower++;
    }
    if (isAlphanumeric(code)) {
      alpha++;
    }
    if (isNumber2(code)) {
      numeric++;
    }
  }
  const upperPercent = upper / word.length;
  const lowerPercent = lower / word.length;
  const alphaPercent = alpha / word.length;
  const numericPercent = numeric / word.length;
  return { upperPercent, lowerPercent, alphaPercent, numericPercent };
}
__name(analyzeCamelCaseWord, "analyzeCamelCaseWord");
function isUpperCaseWord(analysis) {
  const { upperPercent, lowerPercent } = analysis;
  return lowerPercent === 0 && upperPercent > 0.6;
}
__name(isUpperCaseWord, "isUpperCaseWord");
function isCamelCaseWord(analysis) {
  const { upperPercent, lowerPercent, alphaPercent, numericPercent } = analysis;
  return lowerPercent > 0.2 && upperPercent < 0.8 && alphaPercent > 0.6 && numericPercent < 0.2;
}
__name(isCamelCaseWord, "isCamelCaseWord");
function isCamelCasePattern(word) {
  let upper = 0, lower = 0, code = 0, whitespace = 0;
  for (let i = 0; i < word.length; i++) {
    code = word.charCodeAt(i);
    if (isUpper(code)) {
      upper++;
    }
    if (isLower(code)) {
      lower++;
    }
    if (isWhitespace(code)) {
      whitespace++;
    }
  }
  if ((upper === 0 || lower === 0) && whitespace === 0) {
    return word.length <= 30;
  } else {
    return upper <= 5;
  }
}
__name(isCamelCasePattern, "isCamelCasePattern");
function matchesCamelCase(word, camelCaseWord) {
  if (!camelCaseWord) {
    return null;
  }
  camelCaseWord = camelCaseWord.trim();
  if (camelCaseWord.length === 0) {
    return null;
  }
  if (!isCamelCasePattern(word)) {
    return null;
  }
  if (camelCaseWord.length > 60) {
    camelCaseWord = camelCaseWord.substring(0, 60);
  }
  const analysis = analyzeCamelCaseWord(camelCaseWord);
  if (!isCamelCaseWord(analysis)) {
    if (!isUpperCaseWord(analysis)) {
      return null;
    }
    camelCaseWord = camelCaseWord.toLowerCase();
  }
  let result = null;
  let i = 0;
  word = word.toLowerCase();
  while (i < camelCaseWord.length && (result = _matchesCamelCase(word, camelCaseWord, 0, i)) === null) {
    i = nextAnchor(camelCaseWord, i + 1);
  }
  return result;
}
__name(matchesCamelCase, "matchesCamelCase");
function matchesWords(word, target, contiguous = false) {
  if (!target || target.length === 0) {
    return null;
  }
  let result = null;
  let targetIndex = 0;
  word = tryNormalizeToBase(word);
  target = tryNormalizeToBase(target);
  while (targetIndex < target.length) {
    result = _matchesWords(word, target, 0, targetIndex, contiguous);
    if (result !== null) {
      break;
    }
    targetIndex = nextWord(target, targetIndex + 1);
  }
  return result;
}
__name(matchesWords, "matchesWords");
function _matchesWords(word, target, wordIndex, targetIndex, contiguous) {
  let targetIndexOffset = 0;
  if (wordIndex === word.length) {
    return [];
  } else if (targetIndex === target.length) {
    return null;
  } else if (!charactersMatch(word.charCodeAt(wordIndex), target.charCodeAt(targetIndex))) {
    const altChars = getAlternateCodes(word.charCodeAt(wordIndex));
    if (!altChars) {
      return null;
    }
    for (let k = 0; k < altChars.length; k++) {
      if (!charactersMatch(altChars[k], target.charCodeAt(targetIndex + k))) {
        return null;
      }
    }
    targetIndexOffset += altChars.length - 1;
  }
  let result = null;
  let nextWordIndex = targetIndex + targetIndexOffset + 1;
  result = _matchesWords(word, target, wordIndex + 1, nextWordIndex, contiguous);
  if (!contiguous) {
    while (!result && (nextWordIndex = nextWord(target, nextWordIndex)) < target.length) {
      result = _matchesWords(word, target, wordIndex + 1, nextWordIndex, contiguous);
      nextWordIndex++;
    }
  }
  if (!result) {
    return null;
  }
  if (word.charCodeAt(wordIndex) !== target.charCodeAt(targetIndex)) {
    const altChars = getAlternateCodes(word.charCodeAt(wordIndex));
    if (!altChars) {
      return result;
    }
    for (let k = 0; k < altChars.length; k++) {
      if (altChars[k] !== target.charCodeAt(targetIndex + k)) {
        return result;
      }
    }
  }
  return join2({ start: targetIndex, end: targetIndex + targetIndexOffset + 1 }, result);
}
__name(_matchesWords, "_matchesWords");
function nextWord(word, start) {
  for (let i = start; i < word.length; i++) {
    if (isWordSeparator(word.charCodeAt(i)) || i > 0 && isWordSeparator(word.charCodeAt(i - 1))) {
      return i;
    }
  }
  return word.length;
}
__name(nextWord, "nextWord");
var fuzzyContiguousFilter = or(matchesPrefix, matchesCamelCase, matchesContiguousSubString);
var fuzzySeparateFilter = or(matchesPrefix, matchesCamelCase, matchesSubString);
var fuzzyRegExpCache = new LRUCache(1e4);
function matchesFuzzy(word, wordToMatchAgainst, enableSeparateSubstringMatching = false) {
  if (typeof word !== "string" || typeof wordToMatchAgainst !== "string") {
    return null;
  }
  let regexp = fuzzyRegExpCache.get(word);
  if (!regexp) {
    regexp = new RegExp(convertSimple2RegExpPattern(word), "i");
    fuzzyRegExpCache.set(word, regexp);
  }
  const match = regexp.exec(wordToMatchAgainst);
  if (match) {
    return [{ start: match.index, end: match.index + match[0].length }];
  }
  return enableSeparateSubstringMatching ? fuzzySeparateFilter(word, wordToMatchAgainst) : fuzzyContiguousFilter(word, wordToMatchAgainst);
}
__name(matchesFuzzy, "matchesFuzzy");
function matchesFuzzy2(pattern, word) {
  const score = fuzzyScore(pattern, pattern.toLowerCase(), 0, word, word.toLowerCase(), 0, { firstMatchCanBeWeak: true, boostFullMatch: true });
  return score ? createMatches(score) : null;
}
__name(matchesFuzzy2, "matchesFuzzy2");
function anyScore(pattern, lowPattern, patternPos, word, lowWord, wordPos) {
  const max = Math.min(13, pattern.length);
  for (; patternPos < max; patternPos++) {
    const result = fuzzyScore(pattern, lowPattern, patternPos, word, lowWord, wordPos, { firstMatchCanBeWeak: true, boostFullMatch: true });
    if (result) {
      return result;
    }
  }
  return [0, wordPos];
}
__name(anyScore, "anyScore");
function createMatches(score) {
  if (typeof score === "undefined") {
    return [];
  }
  const res = [];
  const wordPos = score[1];
  for (let i = score.length - 1; i > 1; i--) {
    const pos = score[i] + wordPos;
    const last = res[res.length - 1];
    if (last && last.end === pos) {
      last.end = pos + 1;
    } else {
      res.push({ start: pos, end: pos + 1 });
    }
  }
  return res;
}
__name(createMatches, "createMatches");
var _maxLen = 128;
function initTable() {
  const table = [];
  const row = [];
  for (let i = 0; i <= _maxLen; i++) {
    row[i] = 0;
  }
  for (let i = 0; i <= _maxLen; i++) {
    table.push(row.slice(0));
  }
  return table;
}
__name(initTable, "initTable");
function initArr(maxLen) {
  const row = [];
  for (let i = 0; i <= maxLen; i++) {
    row[i] = 0;
  }
  return row;
}
__name(initArr, "initArr");
var _minWordMatchPos = initArr(2 * _maxLen);
var _maxWordMatchPos = initArr(2 * _maxLen);
var _diag = initTable();
var _table = initTable();
var _arrows = initTable();
var _debug = false;
function printTable(table, pattern, patternLen, word, wordLen) {
  function pad(s, n, pad2 = " ") {
    while (s.length < n) {
      s = pad2 + s;
    }
    return s;
  }
  __name(pad, "pad");
  let ret = ` |   |${word.split("").map((c) => pad(c, 3)).join("|")}
`;
  for (let i = 0; i <= patternLen; i++) {
    if (i === 0) {
      ret += " |";
    } else {
      ret += `${pattern[i - 1]}|`;
    }
    ret += table[i].slice(0, wordLen + 1).map((n) => pad(n.toString(), 3)).join("|") + "\n";
  }
  return ret;
}
__name(printTable, "printTable");
function printTables(pattern, patternStart, word, wordStart) {
  pattern = pattern.substr(patternStart);
  word = word.substr(wordStart);
  console.log(printTable(_table, pattern, pattern.length, word, word.length));
  console.log(printTable(_arrows, pattern, pattern.length, word, word.length));
  console.log(printTable(_diag, pattern, pattern.length, word, word.length));
}
__name(printTables, "printTables");
function isSeparatorAtPos(value, index2) {
  if (index2 < 0 || index2 >= value.length) {
    return false;
  }
  const code = value.codePointAt(index2);
  switch (code) {
    case 95:
    case 45:
    case 46:
    case 32:
    case 47:
    case 92:
    case 39:
    case 34:
    case 58:
    case 36:
    case 60:
    case 62:
    case 40:
    case 41:
    case 91:
    case 93:
    case 123:
    case 125:
      return true;
    case void 0:
      return false;
    default:
      if (isEmojiImprecise(code)) {
        return true;
      }
      return false;
  }
}
__name(isSeparatorAtPos, "isSeparatorAtPos");
function isWhitespaceAtPos(value, index2) {
  if (index2 < 0 || index2 >= value.length) {
    return false;
  }
  const code = value.charCodeAt(index2);
  switch (code) {
    case 32:
    case 9:
      return true;
    default:
      return false;
  }
}
__name(isWhitespaceAtPos, "isWhitespaceAtPos");
function isUpperCaseAtPos(pos, word, wordLow) {
  return word[pos] !== wordLow[pos];
}
__name(isUpperCaseAtPos, "isUpperCaseAtPos");
function isPatternInWord(patternLow, patternPos, patternLen, wordLow, wordPos, wordLen, fillMinWordPosArr = false) {
  while (patternPos < patternLen && wordPos < wordLen) {
    if (patternLow[patternPos] === wordLow[wordPos]) {
      if (fillMinWordPosArr) {
        _minWordMatchPos[patternPos] = wordPos;
      }
      patternPos += 1;
    }
    wordPos += 1;
  }
  return patternPos === patternLen;
}
__name(isPatternInWord, "isPatternInWord");
var Arrow;
(function(Arrow2) {
  Arrow2[Arrow2["Diag"] = 1] = "Diag";
  Arrow2[Arrow2["Left"] = 2] = "Left";
  Arrow2[Arrow2["LeftLeft"] = 3] = "LeftLeft";
})(Arrow || (Arrow = {}));
var FuzzyScore;
(function(FuzzyScore2) {
  FuzzyScore2.Default = [-100, 0];
  function isDefault(score) {
    return !score || score.length === 2 && score[0] === -100 && score[1] === 0;
  }
  __name(isDefault, "isDefault");
  FuzzyScore2.isDefault = isDefault;
})(FuzzyScore || (FuzzyScore = {}));
var FuzzyScoreOptions = class {
  static {
    __name(this, "FuzzyScoreOptions");
  }
  static {
    this.default = { boostFullMatch: true, firstMatchCanBeWeak: false };
  }
  constructor(firstMatchCanBeWeak, boostFullMatch) {
    this.firstMatchCanBeWeak = firstMatchCanBeWeak;
    this.boostFullMatch = boostFullMatch;
  }
};
function fuzzyScore(pattern, patternLow, patternStart, word, wordLow, wordStart, options = FuzzyScoreOptions.default) {
  const patternLen = pattern.length > _maxLen ? _maxLen : pattern.length;
  const wordLen = word.length > _maxLen ? _maxLen : word.length;
  if (patternStart >= patternLen || wordStart >= wordLen || patternLen - patternStart > wordLen - wordStart) {
    return void 0;
  }
  if (!isPatternInWord(patternLow, patternStart, patternLen, wordLow, wordStart, wordLen, true)) {
    return void 0;
  }
  _fillInMaxWordMatchPos(patternLen, wordLen, patternStart, wordStart, patternLow, wordLow);
  let row = 1;
  let column = 1;
  let patternPos = patternStart;
  let wordPos = wordStart;
  const hasStrongFirstMatch = [false];
  for (row = 1, patternPos = patternStart; patternPos < patternLen; row++, patternPos++) {
    const minWordMatchPos = _minWordMatchPos[patternPos];
    const maxWordMatchPos = _maxWordMatchPos[patternPos];
    const nextMaxWordMatchPos = patternPos + 1 < patternLen ? _maxWordMatchPos[patternPos + 1] : wordLen;
    for (column = minWordMatchPos - wordStart + 1, wordPos = minWordMatchPos; wordPos < nextMaxWordMatchPos; column++, wordPos++) {
      let score = Number.MIN_SAFE_INTEGER;
      let canComeDiag = false;
      if (wordPos <= maxWordMatchPos) {
        score = _doScore(pattern, patternLow, patternPos, patternStart, word, wordLow, wordPos, wordLen, wordStart, _diag[row - 1][column - 1] === 0, hasStrongFirstMatch);
      }
      let diagScore = 0;
      if (score !== Number.MIN_SAFE_INTEGER) {
        canComeDiag = true;
        diagScore = score + _table[row - 1][column - 1];
      }
      const canComeLeft = wordPos > minWordMatchPos;
      const leftScore = canComeLeft ? _table[row][column - 1] + (_diag[row][column - 1] > 0 ? -5 : 0) : 0;
      const canComeLeftLeft = wordPos > minWordMatchPos + 1 && _diag[row][column - 1] > 0;
      const leftLeftScore = canComeLeftLeft ? _table[row][column - 2] + (_diag[row][column - 2] > 0 ? -5 : 0) : 0;
      if (canComeLeftLeft && (!canComeLeft || leftLeftScore >= leftScore) && (!canComeDiag || leftLeftScore >= diagScore)) {
        _table[row][column] = leftLeftScore;
        _arrows[row][column] = 3;
        _diag[row][column] = 0;
      } else if (canComeLeft && (!canComeDiag || leftScore >= diagScore)) {
        _table[row][column] = leftScore;
        _arrows[row][column] = 2;
        _diag[row][column] = 0;
      } else if (canComeDiag) {
        _table[row][column] = diagScore;
        _arrows[row][column] = 1;
        _diag[row][column] = _diag[row - 1][column - 1] + 1;
      } else {
        throw new Error(`not possible`);
      }
    }
  }
  if (_debug) {
    printTables(pattern, patternStart, word, wordStart);
  }
  if (!hasStrongFirstMatch[0] && !options.firstMatchCanBeWeak) {
    return void 0;
  }
  row--;
  column--;
  const result = [_table[row][column], wordStart];
  let backwardsDiagLength = 0;
  let maxMatchColumn = 0;
  while (row >= 1) {
    let diagColumn = column;
    do {
      const arrow = _arrows[row][diagColumn];
      if (arrow === 3) {
        diagColumn = diagColumn - 2;
      } else if (arrow === 2) {
        diagColumn = diagColumn - 1;
      } else {
        break;
      }
    } while (diagColumn >= 1);
    if (backwardsDiagLength > 1 && patternLow[patternStart + row - 1] === wordLow[wordStart + column - 1] && !isUpperCaseAtPos(diagColumn + wordStart - 1, word, wordLow) && backwardsDiagLength + 1 > _diag[row][diagColumn]) {
      diagColumn = column;
    }
    if (diagColumn === column) {
      backwardsDiagLength++;
    } else {
      backwardsDiagLength = 1;
    }
    if (!maxMatchColumn) {
      maxMatchColumn = diagColumn;
    }
    row--;
    column = diagColumn - 1;
    result.push(column);
  }
  if (wordLen - wordStart === patternLen && options.boostFullMatch) {
    result[0] += 2;
  }
  const skippedCharsCount = maxMatchColumn - patternLen;
  result[0] -= skippedCharsCount;
  return result;
}
__name(fuzzyScore, "fuzzyScore");
function _fillInMaxWordMatchPos(patternLen, wordLen, patternStart, wordStart, patternLow, wordLow) {
  let patternPos = patternLen - 1;
  let wordPos = wordLen - 1;
  while (patternPos >= patternStart && wordPos >= wordStart) {
    if (patternLow[patternPos] === wordLow[wordPos]) {
      _maxWordMatchPos[patternPos] = wordPos;
      patternPos--;
    }
    wordPos--;
  }
}
__name(_fillInMaxWordMatchPos, "_fillInMaxWordMatchPos");
function _doScore(pattern, patternLow, patternPos, patternStart, word, wordLow, wordPos, wordLen, wordStart, newMatchStart, outFirstMatchStrong) {
  if (patternLow[patternPos] !== wordLow[wordPos]) {
    return Number.MIN_SAFE_INTEGER;
  }
  let score = 1;
  let isGapLocation = false;
  if (wordPos === patternPos - patternStart) {
    score = pattern[patternPos] === word[wordPos] ? 7 : 5;
  } else if (isUpperCaseAtPos(wordPos, word, wordLow) && (wordPos === 0 || !isUpperCaseAtPos(wordPos - 1, word, wordLow))) {
    score = pattern[patternPos] === word[wordPos] ? 7 : 5;
    isGapLocation = true;
  } else if (isSeparatorAtPos(wordLow, wordPos) && (wordPos === 0 || !isSeparatorAtPos(wordLow, wordPos - 1))) {
    score = 5;
  } else if (isSeparatorAtPos(wordLow, wordPos - 1) || isWhitespaceAtPos(wordLow, wordPos - 1)) {
    score = 5;
    isGapLocation = true;
  }
  if (score > 1 && patternPos === patternStart) {
    outFirstMatchStrong[0] = true;
  }
  if (!isGapLocation) {
    isGapLocation = isUpperCaseAtPos(wordPos, word, wordLow) || isSeparatorAtPos(wordLow, wordPos - 1) || isWhitespaceAtPos(wordLow, wordPos - 1);
  }
  if (patternPos === patternStart) {
    if (wordPos > wordStart) {
      score -= isGapLocation ? 3 : 5;
    }
  } else {
    if (newMatchStart) {
      score += isGapLocation ? 2 : 0;
    } else {
      score += isGapLocation ? 0 : 1;
    }
  }
  if (wordPos + 1 === wordLen) {
    score -= isGapLocation ? 3 : 5;
  }
  return score;
}
__name(_doScore, "_doScore");
function fuzzyScoreGracefulAggressive(pattern, lowPattern, patternPos, word, lowWord, wordPos, options) {
  return fuzzyScoreWithPermutations(pattern, lowPattern, patternPos, word, lowWord, wordPos, true, options);
}
__name(fuzzyScoreGracefulAggressive, "fuzzyScoreGracefulAggressive");
function fuzzyScoreGraceful(pattern, lowPattern, patternPos, word, lowWord, wordPos, options) {
  return fuzzyScoreWithPermutations(pattern, lowPattern, patternPos, word, lowWord, wordPos, false, options);
}
__name(fuzzyScoreGraceful, "fuzzyScoreGraceful");
function fuzzyScoreWithPermutations(pattern, lowPattern, patternPos, word, lowWord, wordPos, aggressive, options) {
  let top2 = fuzzyScore(pattern, lowPattern, patternPos, word, lowWord, wordPos, options);
  if (top2 && !aggressive) {
    return top2;
  }
  if (pattern.length >= 3) {
    const tries = Math.min(7, pattern.length - 1);
    for (let movingPatternPos = patternPos + 1; movingPatternPos < tries; movingPatternPos++) {
      const newPattern = nextTypoPermutation(pattern, movingPatternPos);
      if (newPattern) {
        const candidate = fuzzyScore(newPattern, newPattern.toLowerCase(), patternPos, word, lowWord, wordPos, options);
        if (candidate) {
          candidate[0] -= 3;
          if (!top2 || candidate[0] > top2[0]) {
            top2 = candidate;
          }
        }
      }
    }
  }
  return top2;
}
__name(fuzzyScoreWithPermutations, "fuzzyScoreWithPermutations");
function nextTypoPermutation(pattern, patternPos) {
  if (patternPos + 1 >= pattern.length) {
    return void 0;
  }
  const swap1 = pattern[patternPos];
  const swap2 = pattern[patternPos + 1];
  if (swap1 === swap2) {
    return void 0;
  }
  return pattern.slice(0, patternPos) + swap2 + swap1 + pattern.slice(patternPos + 2);
}
__name(nextTypoPermutation, "nextTypoPermutation");

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/codiconsUtil.js
var _codiconFontCharacters = /* @__PURE__ */ Object.create(null);
function register(id2, fontCharacter) {
  if (isString(fontCharacter)) {
    const val = _codiconFontCharacters[fontCharacter];
    if (val === void 0) {
      throw new Error(`${id2} references an unknown codicon: ${fontCharacter}`);
    }
    fontCharacter = val;
  }
  _codiconFontCharacters[id2] = fontCharacter;
  return { id: id2 };
}
__name(register, "register");
function getCodiconFontCharacters() {
  return _codiconFontCharacters;
}
__name(getCodiconFontCharacters, "getCodiconFontCharacters");

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/codiconsLibrary.js
var codiconsLibrary = {
  add: register("add", 6e4),
  plus: register("plus", 6e4),
  gistNew: register("gist-new", 6e4),
  repoCreate: register("repo-create", 6e4),
  lightbulb: register("lightbulb", 60001),
  lightBulb: register("light-bulb", 60001),
  repo: register("repo", 60002),
  repoDelete: register("repo-delete", 60002),
  gistFork: register("gist-fork", 60003),
  repoForked: register("repo-forked", 60003),
  gitPullRequest: register("git-pull-request", 60004),
  gitPullRequestAbandoned: register("git-pull-request-abandoned", 60004),
  recordKeys: register("record-keys", 60005),
  keyboard: register("keyboard", 60005),
  tag: register("tag", 60006),
  gitPullRequestLabel: register("git-pull-request-label", 60006),
  tagAdd: register("tag-add", 60006),
  tagRemove: register("tag-remove", 60006),
  person: register("person", 60007),
  personFollow: register("person-follow", 60007),
  personOutline: register("person-outline", 60007),
  personFilled: register("person-filled", 60007),
  sourceControl: register("source-control", 60008),
  mirror: register("mirror", 60009),
  mirrorPublic: register("mirror-public", 60009),
  star: register("star", 60010),
  starAdd: register("star-add", 60010),
  starDelete: register("star-delete", 60010),
  starEmpty: register("star-empty", 60010),
  comment: register("comment", 60011),
  commentAdd: register("comment-add", 60011),
  alert: register("alert", 60012),
  warning: register("warning", 60012),
  search: register("search", 60013),
  searchSave: register("search-save", 60013),
  logOut: register("log-out", 60014),
  signOut: register("sign-out", 60014),
  logIn: register("log-in", 60015),
  signIn: register("sign-in", 60015),
  eye: register("eye", 60016),
  eyeUnwatch: register("eye-unwatch", 60016),
  eyeWatch: register("eye-watch", 60016),
  circleFilled: register("circle-filled", 60017),
  primitiveDot: register("primitive-dot", 60017),
  closeDirty: register("close-dirty", 60017),
  debugBreakpoint: register("debug-breakpoint", 60017),
  debugBreakpointDisabled: register("debug-breakpoint-disabled", 60017),
  debugHint: register("debug-hint", 60017),
  terminalDecorationSuccess: register("terminal-decoration-success", 60017),
  primitiveSquare: register("primitive-square", 60018),
  edit: register("edit", 60019),
  pencil: register("pencil", 60019),
  info: register("info", 60020),
  issueOpened: register("issue-opened", 60020),
  gistPrivate: register("gist-private", 60021),
  gitForkPrivate: register("git-fork-private", 60021),
  lock: register("lock", 60021),
  mirrorPrivate: register("mirror-private", 60021),
  close: register("close", 60022),
  removeClose: register("remove-close", 60022),
  x: register("x", 60022),
  repoSync: register("repo-sync", 60023),
  sync: register("sync", 60023),
  clone: register("clone", 60024),
  desktopDownload: register("desktop-download", 60024),
  beaker: register("beaker", 60025),
  microscope: register("microscope", 60025),
  vm: register("vm", 60026),
  deviceDesktop: register("device-desktop", 60026),
  file: register("file", 60027),
  more: register("more", 60028),
  ellipsis: register("ellipsis", 60028),
  kebabHorizontal: register("kebab-horizontal", 60028),
  mailReply: register("mail-reply", 60029),
  reply: register("reply", 60029),
  organization: register("organization", 60030),
  organizationFilled: register("organization-filled", 60030),
  organizationOutline: register("organization-outline", 60030),
  newFile: register("new-file", 60031),
  fileAdd: register("file-add", 60031),
  newFolder: register("new-folder", 60032),
  fileDirectoryCreate: register("file-directory-create", 60032),
  trash: register("trash", 60033),
  trashcan: register("trashcan", 60033),
  history: register("history", 60034),
  clock: register("clock", 60034),
  folder: register("folder", 60035),
  fileDirectory: register("file-directory", 60035),
  symbolFolder: register("symbol-folder", 60035),
  logoGithub: register("logo-github", 60036),
  markGithub: register("mark-github", 60036),
  github: register("github", 60036),
  terminal: register("terminal", 60037),
  console: register("console", 60037),
  repl: register("repl", 60037),
  zap: register("zap", 60038),
  symbolEvent: register("symbol-event", 60038),
  error: register("error", 60039),
  stop: register("stop", 60039),
  variable: register("variable", 60040),
  symbolVariable: register("symbol-variable", 60040),
  array: register("array", 60042),
  symbolArray: register("symbol-array", 60042),
  symbolModule: register("symbol-module", 60043),
  symbolPackage: register("symbol-package", 60043),
  symbolNamespace: register("symbol-namespace", 60043),
  symbolObject: register("symbol-object", 60043),
  symbolMethod: register("symbol-method", 60044),
  symbolFunction: register("symbol-function", 60044),
  symbolConstructor: register("symbol-constructor", 60044),
  symbolBoolean: register("symbol-boolean", 60047),
  symbolNull: register("symbol-null", 60047),
  symbolNumeric: register("symbol-numeric", 60048),
  symbolNumber: register("symbol-number", 60048),
  symbolStructure: register("symbol-structure", 60049),
  symbolStruct: register("symbol-struct", 60049),
  symbolParameter: register("symbol-parameter", 60050),
  symbolTypeParameter: register("symbol-type-parameter", 60050),
  symbolKey: register("symbol-key", 60051),
  symbolText: register("symbol-text", 60051),
  symbolReference: register("symbol-reference", 60052),
  goToFile: register("go-to-file", 60052),
  symbolEnum: register("symbol-enum", 60053),
  symbolValue: register("symbol-value", 60053),
  symbolRuler: register("symbol-ruler", 60054),
  symbolUnit: register("symbol-unit", 60054),
  activateBreakpoints: register("activate-breakpoints", 60055),
  archive: register("archive", 60056),
  arrowBoth: register("arrow-both", 60057),
  arrowDown: register("arrow-down", 60058),
  arrowLeft: register("arrow-left", 60059),
  arrowRight: register("arrow-right", 60060),
  arrowSmallDown: register("arrow-small-down", 60061),
  arrowSmallLeft: register("arrow-small-left", 60062),
  arrowSmallRight: register("arrow-small-right", 60063),
  arrowSmallUp: register("arrow-small-up", 60064),
  arrowUp: register("arrow-up", 60065),
  bell: register("bell", 60066),
  bold: register("bold", 60067),
  book: register("book", 60068),
  bookmark: register("bookmark", 60069),
  debugBreakpointConditionalUnverified: register("debug-breakpoint-conditional-unverified", 60070),
  debugBreakpointConditional: register("debug-breakpoint-conditional", 60071),
  debugBreakpointConditionalDisabled: register("debug-breakpoint-conditional-disabled", 60071),
  debugBreakpointDataUnverified: register("debug-breakpoint-data-unverified", 60072),
  debugBreakpointData: register("debug-breakpoint-data", 60073),
  debugBreakpointDataDisabled: register("debug-breakpoint-data-disabled", 60073),
  debugBreakpointLogUnverified: register("debug-breakpoint-log-unverified", 60074),
  debugBreakpointLog: register("debug-breakpoint-log", 60075),
  debugBreakpointLogDisabled: register("debug-breakpoint-log-disabled", 60075),
  briefcase: register("briefcase", 60076),
  broadcast: register("broadcast", 60077),
  browser: register("browser", 60078),
  bug: register("bug", 60079),
  calendar: register("calendar", 60080),
  caseSensitive: register("case-sensitive", 60081),
  check: register("check", 60082),
  checklist: register("checklist", 60083),
  chevronDown: register("chevron-down", 60084),
  chevronLeft: register("chevron-left", 60085),
  chevronRight: register("chevron-right", 60086),
  chevronUp: register("chevron-up", 60087),
  chromeClose: register("chrome-close", 60088),
  chromeMaximize: register("chrome-maximize", 60089),
  chromeMinimize: register("chrome-minimize", 60090),
  chromeRestore: register("chrome-restore", 60091),
  circleOutline: register("circle-outline", 60092),
  circle: register("circle", 60092),
  debugBreakpointUnverified: register("debug-breakpoint-unverified", 60092),
  terminalDecorationIncomplete: register("terminal-decoration-incomplete", 60092),
  circleSlash: register("circle-slash", 60093),
  circuitBoard: register("circuit-board", 60094),
  clearAll: register("clear-all", 60095),
  clippy: register("clippy", 60096),
  closeAll: register("close-all", 60097),
  cloudDownload: register("cloud-download", 60098),
  cloudUpload: register("cloud-upload", 60099),
  code: register("code", 60100),
  collapseAll: register("collapse-all", 60101),
  colorMode: register("color-mode", 60102),
  commentDiscussion: register("comment-discussion", 60103),
  creditCard: register("credit-card", 60105),
  dash: register("dash", 60108),
  dashboard: register("dashboard", 60109),
  database: register("database", 60110),
  debugContinue: register("debug-continue", 60111),
  debugDisconnect: register("debug-disconnect", 60112),
  debugPause: register("debug-pause", 60113),
  debugRestart: register("debug-restart", 60114),
  debugStart: register("debug-start", 60115),
  debugStepInto: register("debug-step-into", 60116),
  debugStepOut: register("debug-step-out", 60117),
  debugStepOver: register("debug-step-over", 60118),
  debugStop: register("debug-stop", 60119),
  debug: register("debug", 60120),
  deviceCameraVideo: register("device-camera-video", 60121),
  deviceCamera: register("device-camera", 60122),
  deviceMobile: register("device-mobile", 60123),
  diffAdded: register("diff-added", 60124),
  diffIgnored: register("diff-ignored", 60125),
  diffModified: register("diff-modified", 60126),
  diffRemoved: register("diff-removed", 60127),
  diffRenamed: register("diff-renamed", 60128),
  diff: register("diff", 60129),
  diffSidebyside: register("diff-sidebyside", 60129),
  discard: register("discard", 60130),
  editorLayout: register("editor-layout", 60131),
  emptyWindow: register("empty-window", 60132),
  exclude: register("exclude", 60133),
  extensions: register("extensions", 60134),
  eyeClosed: register("eye-closed", 60135),
  fileBinary: register("file-binary", 60136),
  fileCode: register("file-code", 60137),
  fileMedia: register("file-media", 60138),
  filePdf: register("file-pdf", 60139),
  fileSubmodule: register("file-submodule", 60140),
  fileSymlinkDirectory: register("file-symlink-directory", 60141),
  fileSymlinkFile: register("file-symlink-file", 60142),
  fileZip: register("file-zip", 60143),
  files: register("files", 60144),
  filter: register("filter", 60145),
  flame: register("flame", 60146),
  foldDown: register("fold-down", 60147),
  foldUp: register("fold-up", 60148),
  fold: register("fold", 60149),
  folderActive: register("folder-active", 60150),
  folderOpened: register("folder-opened", 60151),
  gear: register("gear", 60152),
  gift: register("gift", 60153),
  gistSecret: register("gist-secret", 60154),
  gist: register("gist", 60155),
  gitCommit: register("git-commit", 60156),
  gitCompare: register("git-compare", 60157),
  compareChanges: register("compare-changes", 60157),
  gitMerge: register("git-merge", 60158),
  githubAction: register("github-action", 60159),
  githubAlt: register("github-alt", 60160),
  globe: register("globe", 60161),
  grabber: register("grabber", 60162),
  graph: register("graph", 60163),
  gripper: register("gripper", 60164),
  heart: register("heart", 60165),
  home: register("home", 60166),
  horizontalRule: register("horizontal-rule", 60167),
  hubot: register("hubot", 60168),
  inbox: register("inbox", 60169),
  issueReopened: register("issue-reopened", 60171),
  issues: register("issues", 60172),
  italic: register("italic", 60173),
  jersey: register("jersey", 60174),
  json: register("json", 60175),
  bracket: register("bracket", 60175),
  kebabVertical: register("kebab-vertical", 60176),
  key: register("key", 60177),
  law: register("law", 60178),
  lightbulbAutofix: register("lightbulb-autofix", 60179),
  linkExternal: register("link-external", 60180),
  link: register("link", 60181),
  listOrdered: register("list-ordered", 60182),
  listUnordered: register("list-unordered", 60183),
  liveShare: register("live-share", 60184),
  loading: register("loading", 60185),
  location: register("location", 60186),
  mailRead: register("mail-read", 60187),
  mail: register("mail", 60188),
  markdown: register("markdown", 60189),
  megaphone: register("megaphone", 60190),
  mention: register("mention", 60191),
  milestone: register("milestone", 60192),
  gitPullRequestMilestone: register("git-pull-request-milestone", 60192),
  mortarBoard: register("mortar-board", 60193),
  move: register("move", 60194),
  multipleWindows: register("multiple-windows", 60195),
  mute: register("mute", 60196),
  noNewline: register("no-newline", 60197),
  note: register("note", 60198),
  octoface: register("octoface", 60199),
  openPreview: register("open-preview", 60200),
  package: register("package", 60201),
  paintcan: register("paintcan", 60202),
  pin: register("pin", 60203),
  play: register("play", 60204),
  run: register("run", 60204),
  plug: register("plug", 60205),
  preserveCase: register("preserve-case", 60206),
  preview: register("preview", 60207),
  project: register("project", 60208),
  pulse: register("pulse", 60209),
  question: register("question", 60210),
  quote: register("quote", 60211),
  radioTower: register("radio-tower", 60212),
  reactions: register("reactions", 60213),
  references: register("references", 60214),
  refresh: register("refresh", 60215),
  regex: register("regex", 60216),
  remoteExplorer: register("remote-explorer", 60217),
  remote: register("remote", 60218),
  remove: register("remove", 60219),
  replaceAll: register("replace-all", 60220),
  replace: register("replace", 60221),
  repoClone: register("repo-clone", 60222),
  repoForcePush: register("repo-force-push", 60223),
  repoPull: register("repo-pull", 60224),
  repoPush: register("repo-push", 60225),
  report: register("report", 60226),
  requestChanges: register("request-changes", 60227),
  rocket: register("rocket", 60228),
  rootFolderOpened: register("root-folder-opened", 60229),
  rootFolder: register("root-folder", 60230),
  rss: register("rss", 60231),
  ruby: register("ruby", 60232),
  saveAll: register("save-all", 60233),
  saveAs: register("save-as", 60234),
  save: register("save", 60235),
  screenFull: register("screen-full", 60236),
  screenNormal: register("screen-normal", 60237),
  searchStop: register("search-stop", 60238),
  server: register("server", 60240),
  settingsGear: register("settings-gear", 60241),
  settings: register("settings", 60242),
  shield: register("shield", 60243),
  smiley: register("smiley", 60244),
  sortPrecedence: register("sort-precedence", 60245),
  splitHorizontal: register("split-horizontal", 60246),
  splitVertical: register("split-vertical", 60247),
  squirrel: register("squirrel", 60248),
  starFull: register("star-full", 60249),
  starHalf: register("star-half", 60250),
  symbolClass: register("symbol-class", 60251),
  symbolColor: register("symbol-color", 60252),
  symbolConstant: register("symbol-constant", 60253),
  symbolEnumMember: register("symbol-enum-member", 60254),
  symbolField: register("symbol-field", 60255),
  symbolFile: register("symbol-file", 60256),
  symbolInterface: register("symbol-interface", 60257),
  symbolKeyword: register("symbol-keyword", 60258),
  symbolMisc: register("symbol-misc", 60259),
  symbolOperator: register("symbol-operator", 60260),
  symbolProperty: register("symbol-property", 60261),
  wrench: register("wrench", 60261),
  wrenchSubaction: register("wrench-subaction", 60261),
  symbolSnippet: register("symbol-snippet", 60262),
  tasklist: register("tasklist", 60263),
  telescope: register("telescope", 60264),
  textSize: register("text-size", 60265),
  threeBars: register("three-bars", 60266),
  thumbsdown: register("thumbsdown", 60267),
  thumbsup: register("thumbsup", 60268),
  tools: register("tools", 60269),
  triangleDown: register("triangle-down", 60270),
  triangleLeft: register("triangle-left", 60271),
  triangleRight: register("triangle-right", 60272),
  triangleUp: register("triangle-up", 60273),
  twitter: register("twitter", 60274),
  unfold: register("unfold", 60275),
  unlock: register("unlock", 60276),
  unmute: register("unmute", 60277),
  unverified: register("unverified", 60278),
  verified: register("verified", 60279),
  versions: register("versions", 60280),
  vmActive: register("vm-active", 60281),
  vmOutline: register("vm-outline", 60282),
  vmRunning: register("vm-running", 60283),
  watch: register("watch", 60284),
  whitespace: register("whitespace", 60285),
  wholeWord: register("whole-word", 60286),
  window: register("window", 60287),
  wordWrap: register("word-wrap", 60288),
  zoomIn: register("zoom-in", 60289),
  zoomOut: register("zoom-out", 60290),
  listFilter: register("list-filter", 60291),
  listFlat: register("list-flat", 60292),
  listSelection: register("list-selection", 60293),
  selection: register("selection", 60293),
  listTree: register("list-tree", 60294),
  debugBreakpointFunctionUnverified: register("debug-breakpoint-function-unverified", 60295),
  debugBreakpointFunction: register("debug-breakpoint-function", 60296),
  debugBreakpointFunctionDisabled: register("debug-breakpoint-function-disabled", 60296),
  debugStackframeActive: register("debug-stackframe-active", 60297),
  circleSmallFilled: register("circle-small-filled", 60298),
  debugStackframeDot: register("debug-stackframe-dot", 60298),
  terminalDecorationMark: register("terminal-decoration-mark", 60298),
  debugStackframe: register("debug-stackframe", 60299),
  debugStackframeFocused: register("debug-stackframe-focused", 60299),
  debugBreakpointUnsupported: register("debug-breakpoint-unsupported", 60300),
  symbolString: register("symbol-string", 60301),
  debugReverseContinue: register("debug-reverse-continue", 60302),
  debugStepBack: register("debug-step-back", 60303),
  debugRestartFrame: register("debug-restart-frame", 60304),
  debugAlt: register("debug-alt", 60305),
  callIncoming: register("call-incoming", 60306),
  callOutgoing: register("call-outgoing", 60307),
  menu: register("menu", 60308),
  expandAll: register("expand-all", 60309),
  feedback: register("feedback", 60310),
  gitPullRequestReviewer: register("git-pull-request-reviewer", 60310),
  groupByRefType: register("group-by-ref-type", 60311),
  ungroupByRefType: register("ungroup-by-ref-type", 60312),
  account: register("account", 60313),
  gitPullRequestAssignee: register("git-pull-request-assignee", 60313),
  bellDot: register("bell-dot", 60314),
  debugConsole: register("debug-console", 60315),
  library: register("library", 60316),
  output: register("output", 60317),
  runAll: register("run-all", 60318),
  syncIgnored: register("sync-ignored", 60319),
  pinned: register("pinned", 60320),
  githubInverted: register("github-inverted", 60321),
  serverProcess: register("server-process", 60322),
  serverEnvironment: register("server-environment", 60323),
  pass: register("pass", 60324),
  issueClosed: register("issue-closed", 60324),
  stopCircle: register("stop-circle", 60325),
  playCircle: register("play-circle", 60326),
  record: register("record", 60327),
  debugAltSmall: register("debug-alt-small", 60328),
  vmConnect: register("vm-connect", 60329),
  cloud: register("cloud", 60330),
  merge: register("merge", 60331),
  export: register("export", 60332),
  graphLeft: register("graph-left", 60333),
  magnet: register("magnet", 60334),
  notebook: register("notebook", 60335),
  redo: register("redo", 60336),
  checkAll: register("check-all", 60337),
  pinnedDirty: register("pinned-dirty", 60338),
  passFilled: register("pass-filled", 60339),
  circleLargeFilled: register("circle-large-filled", 60340),
  circleLarge: register("circle-large", 60341),
  circleLargeOutline: register("circle-large-outline", 60341),
  combine: register("combine", 60342),
  gather: register("gather", 60342),
  table: register("table", 60343),
  variableGroup: register("variable-group", 60344),
  typeHierarchy: register("type-hierarchy", 60345),
  typeHierarchySub: register("type-hierarchy-sub", 60346),
  typeHierarchySuper: register("type-hierarchy-super", 60347),
  gitPullRequestCreate: register("git-pull-request-create", 60348),
  runAbove: register("run-above", 60349),
  runBelow: register("run-below", 60350),
  notebookTemplate: register("notebook-template", 60351),
  debugRerun: register("debug-rerun", 60352),
  workspaceTrusted: register("workspace-trusted", 60353),
  workspaceUntrusted: register("workspace-untrusted", 60354),
  workspaceUnknown: register("workspace-unknown", 60355),
  terminalCmd: register("terminal-cmd", 60356),
  terminalDebian: register("terminal-debian", 60357),
  terminalLinux: register("terminal-linux", 60358),
  terminalPowershell: register("terminal-powershell", 60359),
  terminalTmux: register("terminal-tmux", 60360),
  terminalUbuntu: register("terminal-ubuntu", 60361),
  terminalBash: register("terminal-bash", 60362),
  arrowSwap: register("arrow-swap", 60363),
  copy: register("copy", 60364),
  personAdd: register("person-add", 60365),
  filterFilled: register("filter-filled", 60366),
  wand: register("wand", 60367),
  debugLineByLine: register("debug-line-by-line", 60368),
  inspect: register("inspect", 60369),
  layers: register("layers", 60370),
  layersDot: register("layers-dot", 60371),
  layersActive: register("layers-active", 60372),
  compass: register("compass", 60373),
  compassDot: register("compass-dot", 60374),
  compassActive: register("compass-active", 60375),
  azure: register("azure", 60376),
  issueDraft: register("issue-draft", 60377),
  gitPullRequestClosed: register("git-pull-request-closed", 60378),
  gitPullRequestDraft: register("git-pull-request-draft", 60379),
  debugAll: register("debug-all", 60380),
  debugCoverage: register("debug-coverage", 60381),
  runErrors: register("run-errors", 60382),
  folderLibrary: register("folder-library", 60383),
  debugContinueSmall: register("debug-continue-small", 60384),
  beakerStop: register("beaker-stop", 60385),
  graphLine: register("graph-line", 60386),
  graphScatter: register("graph-scatter", 60387),
  pieChart: register("pie-chart", 60388),
  bracketDot: register("bracket-dot", 60389),
  bracketError: register("bracket-error", 60390),
  lockSmall: register("lock-small", 60391),
  azureDevops: register("azure-devops", 60392),
  verifiedFilled: register("verified-filled", 60393),
  newline: register("newline", 60394),
  layout: register("layout", 60395),
  layoutActivitybarLeft: register("layout-activitybar-left", 60396),
  layoutActivitybarRight: register("layout-activitybar-right", 60397),
  layoutPanelLeft: register("layout-panel-left", 60398),
  layoutPanelCenter: register("layout-panel-center", 60399),
  layoutPanelJustify: register("layout-panel-justify", 60400),
  layoutPanelRight: register("layout-panel-right", 60401),
  layoutPanel: register("layout-panel", 60402),
  layoutSidebarLeft: register("layout-sidebar-left", 60403),
  layoutSidebarRight: register("layout-sidebar-right", 60404),
  layoutStatusbar: register("layout-statusbar", 60405),
  layoutMenubar: register("layout-menubar", 60406),
  layoutCentered: register("layout-centered", 60407),
  target: register("target", 60408),
  indent: register("indent", 60409),
  recordSmall: register("record-small", 60410),
  errorSmall: register("error-small", 60411),
  terminalDecorationError: register("terminal-decoration-error", 60411),
  arrowCircleDown: register("arrow-circle-down", 60412),
  arrowCircleLeft: register("arrow-circle-left", 60413),
  arrowCircleRight: register("arrow-circle-right", 60414),
  arrowCircleUp: register("arrow-circle-up", 60415),
  layoutSidebarRightOff: register("layout-sidebar-right-off", 60416),
  layoutPanelOff: register("layout-panel-off", 60417),
  layoutSidebarLeftOff: register("layout-sidebar-left-off", 60418),
  blank: register("blank", 60419),
  heartFilled: register("heart-filled", 60420),
  map: register("map", 60421),
  mapHorizontal: register("map-horizontal", 60421),
  foldHorizontal: register("fold-horizontal", 60421),
  mapFilled: register("map-filled", 60422),
  mapHorizontalFilled: register("map-horizontal-filled", 60422),
  foldHorizontalFilled: register("fold-horizontal-filled", 60422),
  circleSmall: register("circle-small", 60423),
  bellSlash: register("bell-slash", 60424),
  bellSlashDot: register("bell-slash-dot", 60425),
  commentUnresolved: register("comment-unresolved", 60426),
  gitPullRequestGoToChanges: register("git-pull-request-go-to-changes", 60427),
  gitPullRequestNewChanges: register("git-pull-request-new-changes", 60428),
  searchFuzzy: register("search-fuzzy", 60429),
  commentDraft: register("comment-draft", 60430),
  send: register("send", 60431),
  sparkle: register("sparkle", 60432),
  insert: register("insert", 60433),
  mic: register("mic", 60434),
  thumbsdownFilled: register("thumbsdown-filled", 60435),
  thumbsupFilled: register("thumbsup-filled", 60436),
  coffee: register("coffee", 60437),
  snake: register("snake", 60438),
  game: register("game", 60439),
  vr: register("vr", 60440),
  chip: register("chip", 60441),
  piano: register("piano", 60442),
  music: register("music", 60443),
  micFilled: register("mic-filled", 60444),
  repoFetch: register("repo-fetch", 60445),
  copilot: register("copilot", 60446),
  lightbulbSparkle: register("lightbulb-sparkle", 60447),
  robot: register("robot", 60448),
  sparkleFilled: register("sparkle-filled", 60449),
  diffSingle: register("diff-single", 60450),
  diffMultiple: register("diff-multiple", 60451),
  surroundWith: register("surround-with", 60452),
  share: register("share", 60453),
  gitStash: register("git-stash", 60454),
  gitStashApply: register("git-stash-apply", 60455),
  gitStashPop: register("git-stash-pop", 60456),
  vscode: register("vscode", 60457),
  vscodeInsiders: register("vscode-insiders", 60458),
  codeOss: register("code-oss", 60459),
  runCoverage: register("run-coverage", 60460),
  runAllCoverage: register("run-all-coverage", 60461),
  coverage: register("coverage", 60462),
  githubProject: register("github-project", 60463),
  mapVertical: register("map-vertical", 60464),
  foldVertical: register("fold-vertical", 60464),
  mapVerticalFilled: register("map-vertical-filled", 60465),
  foldVerticalFilled: register("fold-vertical-filled", 60465),
  goToSearch: register("go-to-search", 60466),
  percentage: register("percentage", 60467),
  sortPercentage: register("sort-percentage", 60467),
  attach: register("attach", 60468),
  goToEditingSession: register("go-to-editing-session", 60469),
  editSession: register("edit-session", 60470),
  codeReview: register("code-review", 60471),
  copilotWarning: register("copilot-warning", 60472),
  python: register("python", 60473),
  copilotLarge: register("copilot-large", 60474),
  copilotWarningLarge: register("copilot-warning-large", 60475),
  keyboardTab: register("keyboard-tab", 60476),
  copilotBlocked: register("copilot-blocked", 60477),
  copilotNotConnected: register("copilot-not-connected", 60478),
  flag: register("flag", 60479),
  lightbulbEmpty: register("lightbulb-empty", 60480),
  symbolMethodArrow: register("symbol-method-arrow", 60481),
  copilotUnavailable: register("copilot-unavailable", 60482),
  repoPinned: register("repo-pinned", 60483),
  keyboardTabAbove: register("keyboard-tab-above", 60484),
  keyboardTabBelow: register("keyboard-tab-below", 60485),
  gitPullRequestDone: register("git-pull-request-done", 60486),
  mcp: register("mcp", 60487),
  extensionsLarge: register("extensions-large", 60488),
  layoutPanelDock: register("layout-panel-dock", 60489),
  layoutSidebarLeftDock: register("layout-sidebar-left-dock", 60490),
  layoutSidebarRightDock: register("layout-sidebar-right-dock", 60491),
  copilotInProgress: register("copilot-in-progress", 60492),
  copilotError: register("copilot-error", 60493),
  copilotSuccess: register("copilot-success", 60494),
  chatSparkle: register("chat-sparkle", 60495),
  searchSparkle: register("search-sparkle", 60496),
  editSparkle: register("edit-sparkle", 60497),
  copilotSnooze: register("copilot-snooze", 60498),
  sendToRemoteAgent: register("send-to-remote-agent", 60499),
  commentDiscussionSparkle: register("comment-discussion-sparkle", 60500),
  chatSparkleWarning: register("chat-sparkle-warning", 60501),
  chatSparkleError: register("chat-sparkle-error", 60502),
  collection: register("collection", 60503),
  newCollection: register("new-collection", 60504),
  thinking: register("thinking", 60505),
  build: register("build", 60506),
  commentDiscussionQuote: register("comment-discussion-quote", 60507),
  cursor: register("cursor", 60508),
  eraser: register("eraser", 60509),
  fileText: register("file-text", 60510),
  quotes: register("quotes", 60512),
  rename: register("rename", 60513),
  runWithDeps: register("run-with-deps", 60514),
  debugConnected: register("debug-connected", 60515),
  strikethrough: register("strikethrough", 60516),
  openInProduct: register("open-in-product", 60517),
  indexZero: register("index-zero", 60518),
  agent: register("agent", 60519),
  editCode: register("edit-code", 60520),
  repoSelected: register("repo-selected", 60521),
  skip: register("skip", 60522),
  mergeInto: register("merge-into", 60523),
  gitBranchChanges: register("git-branch-changes", 60524),
  gitBranchStagedChanges: register("git-branch-staged-changes", 60525),
  gitBranchConflicts: register("git-branch-conflicts", 60526),
  gitBranch: register("git-branch", 60527),
  gitBranchCreate: register("git-branch-create", 60527),
  gitBranchDelete: register("git-branch-delete", 60527),
  searchLarge: register("search-large", 60528),
  terminalGitBash: register("terminal-git-bash", 60529),
  windowActive: register("window-active", 60530),
  forward: register("forward", 60531),
  download: register("download", 60532),
  clockface: register("clockface", 60533),
  unarchive: register("unarchive", 60534),
  sessionInProgress: register("session-in-progress", 60535),
  collectionSmall: register("collection-small", 60536),
  vmSmall: register("vm-small", 60537),
  cloudSmall: register("cloud-small", 60538),
  addSmall: register("add-small", 60539),
  removeSmall: register("remove-small", 60540),
  worktreeSmall: register("worktree-small", 60541),
  worktree: register("worktree", 60542),
  screenCut: register("screen-cut", 60543),
  ask: register("ask", 60544),
  openai: register("openai", 60545),
  claude: register("claude", 60546),
  openInWindow: register("open-in-window", 60547),
  newSession: register("new-session", 60548),
  terminalSecure: register("terminal-secure", 60549)
};

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/codicons.js
function getAllCodicons() {
  return Object.values(Codicon);
}
__name(getAllCodicons, "getAllCodicons");
var codiconsDerived = {
  dialogError: register("dialog-error", "error"),
  dialogWarning: register("dialog-warning", "warning"),
  dialogInfo: register("dialog-info", "info"),
  dialogClose: register("dialog-close", "close"),
  treeItemExpanded: register("tree-item-expanded", "chevron-down"),
  // collapsed is done with rotation
  treeFilterOnTypeOn: register("tree-filter-on-type-on", "list-filter"),
  treeFilterOnTypeOff: register("tree-filter-on-type-off", "list-selection"),
  treeFilterClear: register("tree-filter-clear", "close"),
  treeItemLoading: register("tree-item-loading", "loading"),
  menuSelection: register("menu-selection", "check"),
  menuSubmenu: register("menu-submenu", "chevron-right"),
  menuBarMore: register("menubar-more", "more"),
  scrollbarButtonLeft: register("scrollbar-button-left", "triangle-left"),
  scrollbarButtonRight: register("scrollbar-button-right", "triangle-right"),
  scrollbarButtonUp: register("scrollbar-button-up", "triangle-up"),
  scrollbarButtonDown: register("scrollbar-button-down", "triangle-down"),
  toolBarMore: register("toolbar-more", "more"),
  quickInputBack: register("quick-input-back", "arrow-left"),
  dropDownButton: register("drop-down-button", 60084),
  symbolCustomColor: register("symbol-customcolor", 60252),
  exportIcon: register("export", 60332),
  workspaceUnspecified: register("workspace-unspecified", 60355),
  newLine: register("newline", 60394),
  thumbsDownFilled: register("thumbsdown-filled", 60435),
  thumbsUpFilled: register("thumbsup-filled", 60436),
  gitFetch: register("git-fetch", 60445),
  lightbulbSparkleAutofix: register("lightbulb-sparkle-autofix", 60447),
  debugBreakpointPending: register("debug-breakpoint-pending", 60377),
  chatImport: register("chat-import", 60550),
  chatExport: register("chat-export", 60551)
};
var Codicon = {
  ...codiconsLibrary,
  ...codiconsDerived
};

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/themables.js
var ThemeColor;
(function(ThemeColor4) {
  function isThemeColor(obj) {
    return !!obj && typeof obj === "object" && typeof obj.id === "string";
  }
  __name(isThemeColor, "isThemeColor");
  ThemeColor4.isThemeColor = isThemeColor;
})(ThemeColor || (ThemeColor = {}));
function themeColorFromId(id2) {
  return { id: id2 };
}
__name(themeColorFromId, "themeColorFromId");
var ThemeIcon;
(function(ThemeIcon4) {
  ThemeIcon4.iconNameSegment = "[A-Za-z0-9]+";
  ThemeIcon4.iconNameExpression = "[A-Za-z0-9-]+";
  ThemeIcon4.iconModifierExpression = "~[A-Za-z]+";
  ThemeIcon4.iconNameCharacter = "[A-Za-z0-9~-]";
  const ThemeIconIdRegex = new RegExp(`^(${ThemeIcon4.iconNameExpression})(${ThemeIcon4.iconModifierExpression})?$`);
  function asClassNameArray(icon) {
    const match = ThemeIconIdRegex.exec(icon.id);
    if (!match) {
      return asClassNameArray(Codicon.error);
    }
    const [, id2, modifier] = match;
    const classNames = ["codicon", "codicon-" + id2];
    if (modifier) {
      classNames.push("codicon-modifier-" + modifier.substring(1));
    }
    return classNames;
  }
  __name(asClassNameArray, "asClassNameArray");
  ThemeIcon4.asClassNameArray = asClassNameArray;
  function asClassName(icon) {
    return asClassNameArray(icon).join(" ");
  }
  __name(asClassName, "asClassName");
  ThemeIcon4.asClassName = asClassName;
  function asCSSSelector(icon) {
    return "." + asClassNameArray(icon).join(".");
  }
  __name(asCSSSelector, "asCSSSelector");
  ThemeIcon4.asCSSSelector = asCSSSelector;
  function isThemeIcon(obj) {
    return !!obj && typeof obj === "object" && typeof obj.id === "string" && (typeof obj.color === "undefined" || ThemeColor.isThemeColor(obj.color));
  }
  __name(isThemeIcon, "isThemeIcon");
  ThemeIcon4.isThemeIcon = isThemeIcon;
  const _regexFromString = new RegExp(`^\\$\\((${ThemeIcon4.iconNameExpression}(?:${ThemeIcon4.iconModifierExpression})?)\\)$`);
  function fromString(str) {
    const match = _regexFromString.exec(str);
    if (!match) {
      return void 0;
    }
    const [, name] = match;
    return { id: name };
  }
  __name(fromString, "fromString");
  ThemeIcon4.fromString = fromString;
  function fromId(id2) {
    return { id: id2 };
  }
  __name(fromId, "fromId");
  ThemeIcon4.fromId = fromId;
  function modify(icon, modifier) {
    let id2 = icon.id;
    const tildeIndex = id2.lastIndexOf("~");
    if (tildeIndex !== -1) {
      id2 = id2.substring(0, tildeIndex);
    }
    if (modifier) {
      id2 = `${id2}~${modifier}`;
    }
    return { id: id2 };
  }
  __name(modify, "modify");
  ThemeIcon4.modify = modify;
  function getModifier(icon) {
    const tildeIndex = icon.id.lastIndexOf("~");
    if (tildeIndex !== -1) {
      return icon.id.substring(tildeIndex + 1);
    }
    return void 0;
  }
  __name(getModifier, "getModifier");
  ThemeIcon4.getModifier = getModifier;
  function isEqual3(ti1, ti2) {
    return ti1.id === ti2.id && ti1.color?.id === ti2.color?.id;
  }
  __name(isEqual3, "isEqual");
  ThemeIcon4.isEqual = isEqual3;
  function isFile(icon) {
    return icon?.id === Codicon.file.id;
  }
  __name(isFile, "isFile");
  ThemeIcon4.isFile = isFile;
  function isFolder(icon) {
    return icon?.id === Codicon.folder.id;
  }
  __name(isFolder, "isFolder");
  ThemeIcon4.isFolder = isFolder;
})(ThemeIcon || (ThemeIcon = {}));

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/iconLabels.js
var iconStartMarker = "$(";
var iconsRegex = new RegExp(`\\$\\(${ThemeIcon.iconNameExpression}(?:${ThemeIcon.iconModifierExpression})?\\)`, "g");
var escapeIconsRegex = new RegExp(`(\\\\)?${iconsRegex.source}`, "g");
function escapeIcons(text) {
  return text.replace(escapeIconsRegex, (match, escaped) => escaped ? match : `\\${match}`);
}
__name(escapeIcons, "escapeIcons");
var markdownEscapedIconsRegex = new RegExp(`\\\\${iconsRegex.source}`, "g");
function markdownEscapeEscapedIcons(text) {
  return text.replace(markdownEscapedIconsRegex, (match) => `\\${match}`);
}
__name(markdownEscapeEscapedIcons, "markdownEscapeEscapedIcons");
var stripIconsRegex = new RegExp(`(\\s)?(\\\\)?${iconsRegex.source}(\\s)?`, "g");
function stripIcons(text) {
  if (text.indexOf(iconStartMarker) === -1) {
    return text;
  }
  return text.replace(stripIconsRegex, (match, preWhitespace, escaped, postWhitespace) => escaped ? match : preWhitespace || postWhitespace || "");
}
__name(stripIcons, "stripIcons");
function getCodiconAriaLabel(text) {
  if (!text) {
    return "";
  }
  return text.replace(/\$\((.*?)\)/g, (_match, codiconName) => ` ${codiconName} `).trim();
}
__name(getCodiconAriaLabel, "getCodiconAriaLabel");
var _parseIconsRegex = new RegExp(`\\$\\(${ThemeIcon.iconNameCharacter}+\\)`, "g");
function parseLabelWithIcons(input) {
  _parseIconsRegex.lastIndex = 0;
  let text = "";
  const iconOffsets = [];
  let iconsOffset = 0;
  while (true) {
    const pos = _parseIconsRegex.lastIndex;
    const match = _parseIconsRegex.exec(input);
    const chars = input.substring(pos, match?.index);
    if (chars.length > 0) {
      text += chars;
      for (let i = 0; i < chars.length; i++) {
        iconOffsets.push(iconsOffset);
      }
    }
    if (!match) {
      break;
    }
    iconsOffset += match[0].length;
  }
  return { text, iconOffsets };
}
__name(parseLabelWithIcons, "parseLabelWithIcons");
function matchesFuzzyIconAware(query, target, enableSeparateSubstringMatching = false) {
  const { text, iconOffsets } = target;
  if (!iconOffsets || iconOffsets.length === 0) {
    return matchesFuzzy(query, text, enableSeparateSubstringMatching);
  }
  const wordToMatchAgainstWithoutIconsTrimmed = ltrim(text, " ");
  const leadingWhitespaceOffset = text.length - wordToMatchAgainstWithoutIconsTrimmed.length;
  const matches = matchesFuzzy(query, wordToMatchAgainstWithoutIconsTrimmed, enableSeparateSubstringMatching);
  if (matches) {
    for (const match of matches) {
      const iconOffset = iconOffsets[match.start + leadingWhitespaceOffset] + leadingWhitespaceOffset;
      match.start += iconOffset;
      match.end += iconOffset;
    }
  }
  return matches;
}
__name(matchesFuzzyIconAware, "matchesFuzzyIconAware");

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/extpath.js
function isPathSeparator2(code) {
  return code === 47 || code === 92;
}
__name(isPathSeparator2, "isPathSeparator");
function toSlashes(osPath) {
  return osPath.replace(/[\\/]/g, posix.sep);
}
__name(toSlashes, "toSlashes");
function toPosixPath(osPath) {
  if (osPath.indexOf("/") === -1) {
    osPath = toSlashes(osPath);
  }
  if (/^[a-zA-Z]:(\/|$)/.test(osPath)) {
    osPath = "/" + osPath;
  }
  return osPath;
}
__name(toPosixPath, "toPosixPath");
function getRoot(path, sep2 = posix.sep) {
  if (!path) {
    return "";
  }
  const len = path.length;
  const firstLetter = path.charCodeAt(0);
  if (isPathSeparator2(firstLetter)) {
    if (isPathSeparator2(path.charCodeAt(1))) {
      if (!isPathSeparator2(path.charCodeAt(2))) {
        let pos2 = 3;
        const start = pos2;
        for (; pos2 < len; pos2++) {
          if (isPathSeparator2(path.charCodeAt(pos2))) {
            break;
          }
        }
        if (start !== pos2 && !isPathSeparator2(path.charCodeAt(pos2 + 1))) {
          pos2 += 1;
          for (; pos2 < len; pos2++) {
            if (isPathSeparator2(path.charCodeAt(pos2))) {
              return path.slice(0, pos2 + 1).replace(/[\\/]/g, sep2);
            }
          }
        }
      }
    }
    return sep2;
  } else if (isWindowsDriveLetter(firstLetter)) {
    if (path.charCodeAt(1) === 58) {
      if (isPathSeparator2(path.charCodeAt(2))) {
        return path.slice(0, 2) + sep2;
      } else {
        return path.slice(0, 2);
      }
    }
  }
  let pos = path.indexOf("://");
  if (pos !== -1) {
    pos += 3;
    for (; pos < len; pos++) {
      if (isPathSeparator2(path.charCodeAt(pos))) {
        return path.slice(0, pos + 1);
      }
    }
  }
  return "";
}
__name(getRoot, "getRoot");
function isUNC(path) {
  if (!isWindows) {
    return false;
  }
  if (!path || path.length < 5) {
    return false;
  }
  let code = path.charCodeAt(0);
  if (code !== 92) {
    return false;
  }
  code = path.charCodeAt(1);
  if (code !== 92) {
    return false;
  }
  let pos = 2;
  const start = pos;
  for (; pos < path.length; pos++) {
    code = path.charCodeAt(pos);
    if (code === 92) {
      break;
    }
  }
  if (start === pos) {
    return false;
  }
  code = path.charCodeAt(pos + 1);
  if (isNaN(code) || code === 92) {
    return false;
  }
  return true;
}
__name(isUNC, "isUNC");
var WINDOWS_INVALID_FILE_CHARS = /[\\/:\*\?"<>\|]/g;
var UNIX_INVALID_FILE_CHARS = /[/]/g;
var WINDOWS_FORBIDDEN_NAMES = /^(con|prn|aux|clock\$|nul|lpt[0-9]|com[0-9])(\.(.*?))?$/i;
function isValidBasename(name, isWindowsOS = isWindows) {
  const invalidFileChars = isWindowsOS ? WINDOWS_INVALID_FILE_CHARS : UNIX_INVALID_FILE_CHARS;
  if (!name || name.length === 0 || /^\s+$/.test(name)) {
    return false;
  }
  invalidFileChars.lastIndex = 0;
  if (invalidFileChars.test(name)) {
    return false;
  }
  if (isWindowsOS && WINDOWS_FORBIDDEN_NAMES.test(name)) {
    return false;
  }
  if (name === "." || name === "..") {
    return false;
  }
  if (isWindowsOS && name[name.length - 1] === ".") {
    return false;
  }
  if (isWindowsOS && name.length !== name.trim().length) {
    return false;
  }
  if (name.length > 255) {
    return false;
  }
  return true;
}
__name(isValidBasename, "isValidBasename");
function isEqual(pathA, pathB, ignoreCase) {
  const identityEquals = pathA === pathB;
  if (!ignoreCase || identityEquals) {
    return identityEquals;
  }
  if (!pathA || !pathB) {
    return false;
  }
  return equalsIgnoreCase(pathA, pathB);
}
__name(isEqual, "isEqual");
function isEqualOrParent(base, parentCandidate, ignoreCase, separator = sep) {
  if (base === parentCandidate) {
    return true;
  }
  if (!base || !parentCandidate) {
    return false;
  }
  if (parentCandidate.length > base.length) {
    return false;
  }
  if (ignoreCase) {
    const beginsWith = startsWithIgnoreCase(base, parentCandidate);
    if (!beginsWith) {
      return false;
    }
    if (parentCandidate.length === base.length) {
      return true;
    }
    let sepOffset = parentCandidate.length;
    if (parentCandidate.charAt(parentCandidate.length - 1) === separator) {
      sepOffset--;
    }
    return base.charAt(sepOffset) === separator;
  }
  if (parentCandidate.charAt(parentCandidate.length - 1) !== separator) {
    parentCandidate += separator;
  }
  return base.indexOf(parentCandidate) === 0;
}
__name(isEqualOrParent, "isEqualOrParent");
function isWindowsDriveLetter(char0) {
  return char0 >= 65 && char0 <= 90 || char0 >= 97 && char0 <= 122;
}
__name(isWindowsDriveLetter, "isWindowsDriveLetter");
function sanitizeFilePath(candidate, cwd2) {
  if (isWindows && candidate.endsWith(":")) {
    candidate += sep;
  }
  if (!isAbsolute(candidate)) {
    candidate = join(cwd2, candidate);
  }
  candidate = normalize(candidate);
  return removeTrailingPathSeparator(candidate);
}
__name(sanitizeFilePath, "sanitizeFilePath");
function removeTrailingPathSeparator(candidate) {
  if (isWindows) {
    candidate = rtrim(candidate, sep);
    if (candidate.endsWith(":")) {
      candidate += sep;
    }
  } else {
    candidate = rtrim(candidate, sep);
    if (!candidate) {
      candidate = sep;
    }
  }
  return candidate;
}
__name(removeTrailingPathSeparator, "removeTrailingPathSeparator");
function isRootOrDriveLetter(path) {
  const pathNormalized = normalize(path);
  if (isWindows) {
    if (path.length > 3) {
      return false;
    }
    return hasDriveLetter(pathNormalized) && (path.length === 2 || pathNormalized.charCodeAt(2) === 92);
  }
  return pathNormalized === posix.sep;
}
__name(isRootOrDriveLetter, "isRootOrDriveLetter");
function hasDriveLetter(path, isWindowsOS = isWindows) {
  if (isWindowsOS) {
    return isWindowsDriveLetter(path.charCodeAt(0)) && path.charCodeAt(1) === 58;
  }
  return false;
}
__name(hasDriveLetter, "hasDriveLetter");
function getDriveLetter(path, isWindowsOS = isWindows) {
  return hasDriveLetter(path, isWindowsOS) ? path[0] : void 0;
}
__name(getDriveLetter, "getDriveLetter");
function indexOfPath(path, candidate, ignoreCase) {
  if (candidate.length > path.length) {
    return -1;
  }
  if (path === candidate) {
    return 0;
  }
  if (ignoreCase) {
    path = path.toLowerCase();
    candidate = candidate.toLowerCase();
  }
  return path.indexOf(candidate);
}
__name(indexOfPath, "indexOfPath");
function parseLineAndColumnAware(rawPath) {
  const segments = rawPath.split(":");
  let path;
  let line;
  let column;
  for (const segment of segments) {
    const segmentAsNumber = Number(segment);
    if (!isNumber(segmentAsNumber)) {
      path = path ? [path, segment].join(":") : segment;
    } else if (line === void 0) {
      line = segmentAsNumber;
    } else if (column === void 0) {
      column = segmentAsNumber;
    }
  }
  if (!path) {
    throw new Error("Format for `--goto` should be: `FILE:LINE(:COLUMN)`");
  }
  return {
    path,
    line: line !== void 0 ? line : void 0,
    column: column !== void 0 ? column : line !== void 0 ? 1 : void 0
    // if we have a line, make sure column is also set
  };
}
__name(parseLineAndColumnAware, "parseLineAndColumnAware");
var pathChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
var windowsSafePathFirstChars = "BDEFGHIJKMOQRSTUVWXYZbdefghijkmoqrstuvwxyz0123456789";
function randomPath(parent, prefix, randomLength = 8) {
  let suffix = "";
  for (let i = 0; i < randomLength; i++) {
    let pathCharsTouse;
    if (i === 0 && isWindows && !prefix && (randomLength === 3 || randomLength === 4)) {
      pathCharsTouse = windowsSafePathFirstChars;
    } else {
      pathCharsTouse = pathChars;
    }
    suffix += pathCharsTouse.charAt(Math.floor(Math.random() * pathCharsTouse.length));
  }
  let randomFileName;
  if (prefix) {
    randomFileName = `${prefix}-${suffix}`;
  } else {
    randomFileName = suffix;
  }
  if (parent) {
    return join(parent, randomFileName);
  }
  return randomFileName;
}
__name(randomPath, "randomPath");

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/resources.js
function originalFSPath(uri) {
  return uriToFsPath(uri, true);
}
__name(originalFSPath, "originalFSPath");
var ExtUri = class {
  static {
    __name(this, "ExtUri");
  }
  constructor(_ignorePathCasing) {
    this._ignorePathCasing = _ignorePathCasing;
  }
  compare(uri1, uri2, ignoreFragment = false) {
    if (uri1 === uri2) {
      return 0;
    }
    return compare(this.getComparisonKey(uri1, ignoreFragment), this.getComparisonKey(uri2, ignoreFragment));
  }
  isEqual(uri1, uri2, ignoreFragment = false) {
    if (uri1 === uri2) {
      return true;
    }
    if (!uri1 || !uri2) {
      return false;
    }
    return this.getComparisonKey(uri1, ignoreFragment) === this.getComparisonKey(uri2, ignoreFragment);
  }
  getComparisonKey(uri, ignoreFragment = false) {
    return uri.with({
      path: this._ignorePathCasing(uri) ? uri.path.toLowerCase() : void 0,
      fragment: ignoreFragment ? null : void 0
    }).toString();
  }
  ignorePathCasing(uri) {
    return this._ignorePathCasing(uri);
  }
  isEqualOrParent(base, parentCandidate, ignoreFragment = false) {
    if (base.scheme === parentCandidate.scheme) {
      if (base.scheme === Schemas.file) {
        return isEqualOrParent(originalFSPath(base), originalFSPath(parentCandidate), this._ignorePathCasing(base)) && base.query === parentCandidate.query && (ignoreFragment || base.fragment === parentCandidate.fragment);
      }
      if (isEqualAuthority(base.authority, parentCandidate.authority)) {
        return isEqualOrParent(base.path, parentCandidate.path, this._ignorePathCasing(base), "/") && base.query === parentCandidate.query && (ignoreFragment || base.fragment === parentCandidate.fragment);
      }
    }
    return false;
  }
  // --- path math
  joinPath(resource, ...pathFragment) {
    return URI.joinPath(resource, ...pathFragment);
  }
  basenameOrAuthority(resource) {
    return basename2(resource) || resource.authority;
  }
  basename(resource, suffix) {
    return posix.basename(resource.path, suffix);
  }
  extname(resource) {
    return posix.extname(resource.path);
  }
  dirname(resource) {
    if (resource.path.length === 0) {
      return resource;
    }
    let dirname3;
    if (resource.scheme === Schemas.file) {
      dirname3 = URI.file(dirname(originalFSPath(resource))).path;
    } else {
      dirname3 = posix.dirname(resource.path);
      if (resource.authority && dirname3.length && dirname3.charCodeAt(0) !== 47) {
        console.error(`dirname("${resource.toString})) resulted in a relative path`);
        dirname3 = "/";
      }
    }
    return resource.with({
      path: dirname3
    });
  }
  normalizePath(resource) {
    if (!resource.path.length) {
      return resource;
    }
    let normalizedPath;
    if (resource.scheme === Schemas.file) {
      normalizedPath = URI.file(normalize(originalFSPath(resource))).path;
    } else {
      normalizedPath = posix.normalize(resource.path);
    }
    return resource.with({
      path: normalizedPath
    });
  }
  relativePath(from, to) {
    if (from.scheme !== to.scheme || !isEqualAuthority(from.authority, to.authority)) {
      return void 0;
    }
    if (from.scheme === Schemas.file) {
      const relativePath2 = relative(originalFSPath(from), originalFSPath(to));
      return isWindows ? toSlashes(relativePath2) : relativePath2;
    }
    let fromPath = from.path || "/";
    const toPath = to.path || "/";
    if (this._ignorePathCasing(from)) {
      let i = 0;
      for (const len = Math.min(fromPath.length, toPath.length); i < len; i++) {
        if (fromPath.charCodeAt(i) !== toPath.charCodeAt(i)) {
          if (fromPath.charAt(i).toLowerCase() !== toPath.charAt(i).toLowerCase()) {
            break;
          }
        }
      }
      fromPath = toPath.substr(0, i) + fromPath.substr(i);
    }
    return posix.relative(fromPath, toPath);
  }
  resolvePath(base, path) {
    if (base.scheme === Schemas.file) {
      const newURI = URI.file(resolve(originalFSPath(base), path));
      return base.with({
        authority: newURI.authority,
        path: newURI.path
      });
    }
    path = toPosixPath(path);
    return base.with({
      path: posix.resolve(base.path, path)
    });
  }
  // --- misc
  isAbsolutePath(resource) {
    return !!resource.path && resource.path[0] === "/";
  }
  isEqualAuthority(a1, a2) {
    return a1 === a2 || a1 !== void 0 && a2 !== void 0 && equalsIgnoreCase(a1, a2);
  }
  hasTrailingPathSeparator(resource, sep2 = sep) {
    if (resource.scheme === Schemas.file) {
      const fsp = originalFSPath(resource);
      return fsp.length > getRoot(fsp).length && fsp[fsp.length - 1] === sep2;
    } else {
      const p = resource.path;
      return p.length > 1 && p.charCodeAt(p.length - 1) === 47 && !/^[a-zA-Z]:(\/$|\\$)/.test(resource.fsPath);
    }
  }
  removeTrailingPathSeparator(resource, sep2 = sep) {
    if (hasTrailingPathSeparator(resource, sep2)) {
      return resource.with({ path: resource.path.substr(0, resource.path.length - 1) });
    }
    return resource;
  }
  addTrailingPathSeparator(resource, sep2 = sep) {
    let isRootSep = false;
    if (resource.scheme === Schemas.file) {
      const fsp = originalFSPath(resource);
      isRootSep = fsp !== void 0 && fsp.length === getRoot(fsp).length && fsp[fsp.length - 1] === sep2;
    } else {
      sep2 = "/";
      const p = resource.path;
      isRootSep = p.length === 1 && p.charCodeAt(p.length - 1) === 47;
    }
    if (!isRootSep && !hasTrailingPathSeparator(resource, sep2)) {
      return resource.with({ path: resource.path + "/" });
    }
    return resource;
  }
};
var extUri = new ExtUri(() => false);
var extUriBiasedIgnorePathCase = new ExtUri((uri) => {
  return uri.scheme === Schemas.file ? !isLinux : true;
});
var extUriIgnorePathCase = new ExtUri((_) => true);
var isEqual2 = extUri.isEqual.bind(extUri);
var isEqualOrParent2 = extUri.isEqualOrParent.bind(extUri);
var getComparisonKey = extUri.getComparisonKey.bind(extUri);
var basenameOrAuthority = extUri.basenameOrAuthority.bind(extUri);
var basename2 = extUri.basename.bind(extUri);
var extname2 = extUri.extname.bind(extUri);
var dirname2 = extUri.dirname.bind(extUri);
var joinPath = extUri.joinPath.bind(extUri);
var normalizePath = extUri.normalizePath.bind(extUri);
var relativePath = extUri.relativePath.bind(extUri);
var resolvePath = extUri.resolvePath.bind(extUri);
var isAbsolutePath = extUri.isAbsolutePath.bind(extUri);
var isEqualAuthority = extUri.isEqualAuthority.bind(extUri);
var hasTrailingPathSeparator = extUri.hasTrailingPathSeparator.bind(extUri);
var removeTrailingPathSeparator2 = extUri.removeTrailingPathSeparator.bind(extUri);
var addTrailingPathSeparator = extUri.addTrailingPathSeparator.bind(extUri);
function distinctParents(items, resourceAccessor) {
  const distinctParents2 = [];
  for (let i = 0; i < items.length; i++) {
    const candidateResource = resourceAccessor(items[i]);
    if (items.some((otherItem, index2) => {
      if (index2 === i) {
        return false;
      }
      return isEqualOrParent2(candidateResource, resourceAccessor(otherItem));
    })) {
      continue;
    }
    distinctParents2.push(items[i]);
  }
  return distinctParents2;
}
__name(distinctParents, "distinctParents");
var DataUri;
(function(DataUri2) {
  DataUri2.META_DATA_LABEL = "label";
  DataUri2.META_DATA_DESCRIPTION = "description";
  DataUri2.META_DATA_SIZE = "size";
  DataUri2.META_DATA_MIME = "mime";
  function parseMetaData(dataUri) {
    const metadata = /* @__PURE__ */ new Map();
    const meta = dataUri.path.substring(dataUri.path.indexOf(";") + 1, dataUri.path.lastIndexOf(";"));
    meta.split(";").forEach((property) => {
      const [key, value] = property.split(":");
      if (key && value) {
        metadata.set(key, value);
      }
    });
    const mime = dataUri.path.substring(0, dataUri.path.indexOf(";"));
    if (mime) {
      metadata.set(DataUri2.META_DATA_MIME, mime);
    }
    return metadata;
  }
  __name(parseMetaData, "parseMetaData");
  DataUri2.parseMetaData = parseMetaData;
})(DataUri || (DataUri = {}));
function toLocalResource(resource, authority, localScheme) {
  if (authority) {
    let path = resource.path;
    if (path && path[0] !== posix.sep) {
      path = posix.sep + path;
    }
    return resource.with({ scheme: localScheme, authority, path });
  }
  return resource.with({ scheme: localScheme });
}
__name(toLocalResource, "toLocalResource");

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/base/common/htmlContent.js
var MarkdownStringTextNewlineStyle;
(function(MarkdownStringTextNewlineStyle2) {
  MarkdownStringTextNewlineStyle2[MarkdownStringTextNewlineStyle2["Paragraph"] = 0] = "Paragraph";
  MarkdownStringTextNewlineStyle2[MarkdownStringTextNewlineStyle2["Break"] = 1] = "Break";
})(MarkdownStringTextNewlineStyle || (MarkdownStringTextNewlineStyle = {}));
var MarkdownString = class _MarkdownString {
  static {
    __name(this, "MarkdownString");
  }
  static lift(dto) {
    const markdownString = new _MarkdownString(dto.value, dto);
    markdownString.uris = dto.uris;
    markdownString.baseUri = dto.baseUri ? URI.revive(dto.baseUri) : void 0;
    return markdownString;
  }
  constructor(value = "", isTrustedOrOptions = false) {
    this.value = value;
    if (typeof this.value !== "string") {
      throw illegalArgument("value");
    }
    if (typeof isTrustedOrOptions === "boolean") {
      this.isTrusted = isTrustedOrOptions;
      this.supportThemeIcons = false;
      this.supportHtml = false;
      this.supportAlertSyntax = false;
    } else {
      this.isTrusted = isTrustedOrOptions.isTrusted ?? void 0;
      this.supportThemeIcons = isTrustedOrOptions.supportThemeIcons ?? false;
      this.supportHtml = isTrustedOrOptions.supportHtml ?? false;
      this.supportAlertSyntax = isTrustedOrOptions.supportAlertSyntax ?? false;
    }
  }
  appendText(value, newlineStyle = 0) {
    this.value += escapeMarkdownSyntaxTokens(this.supportThemeIcons ? escapeIcons(value) : value).replace(/([ \t]+)/g, (_match, g1) => "&nbsp;".repeat(g1.length)).replace(/\>/gm, "\\>").replace(/\n/g, newlineStyle === 1 ? "\\\n" : "\n\n");
    return this;
  }
  appendMarkdown(value) {
    this.value += value;
    return this;
  }
  appendCodeblock(langId, code) {
    this.value += `
${appendEscapedMarkdownCodeBlockFence(code, langId)}
`;
    return this;
  }
  appendLink(target, label, title) {
    this.value += "[";
    this.value += this._escape(label, "]");
    this.value += "](";
    this.value += this._escape(String(target), ")");
    if (title) {
      this.value += ` "${this._escape(this._escape(title, '"'), ")")}"`;
    }
    this.value += ")";
    return this;
  }
  _escape(value, ch) {
    const r = new RegExp(escapeRegExpCharacters(ch), "g");
    return value.replace(r, (match, offset) => {
      if (value.charAt(offset - 1) !== "\\") {
        return `\\${match}`;
      } else {
        return match;
      }
    });
  }
};
function isEmptyMarkdownString(oneOrMany) {
  if (isMarkdownString(oneOrMany)) {
    return !oneOrMany.value;
  } else if (Array.isArray(oneOrMany)) {
    return oneOrMany.every(isEmptyMarkdownString);
  } else {
    return true;
  }
}
__name(isEmptyMarkdownString, "isEmptyMarkdownString");
function isMarkdownString(thing) {
  if (thing instanceof MarkdownString) {
    return true;
  } else if (thing && typeof thing === "object") {
    return typeof thing.value === "string" && (typeof thing.isTrusted === "boolean" || typeof thing.isTrusted === "object" || thing.isTrusted === void 0) && (typeof thing.supportThemeIcons === "boolean" || thing.supportThemeIcons === void 0) && (typeof thing.supportAlertSyntax === "boolean" || thing.supportAlertSyntax === void 0);
  }
  return false;
}
__name(isMarkdownString, "isMarkdownString");
function markdownStringEqual(a, b) {
  if (a === b) {
    return true;
  } else if (!a || !b) {
    return false;
  } else {
    return a.value === b.value && a.isTrusted === b.isTrusted && a.supportThemeIcons === b.supportThemeIcons && a.supportHtml === b.supportHtml && a.supportAlertSyntax === b.supportAlertSyntax && (a.baseUri === b.baseUri || !!a.baseUri && !!b.baseUri && isEqual2(URI.from(a.baseUri), URI.from(b.baseUri)));
  }
}
__name(markdownStringEqual, "markdownStringEqual");
function escapeMarkdownSyntaxTokens(text) {
  return text.replace(/[\\`*_{}[\]()#+\-!~]/g, "\\$&");
}
__name(escapeMarkdownSyntaxTokens, "escapeMarkdownSyntaxTokens");
function appendEscapedMarkdownCodeBlockFence(code, langId) {
  const longestFenceLength = code.match(/^`+/gm)?.reduce((a, b) => a.length > b.length ? a : b).length ?? 0;
  const desiredFenceLength = longestFenceLength >= 3 ? longestFenceLength + 1 : 3;
  return [
    `${"`".repeat(desiredFenceLength)}${langId}`,
    code,
    `${"`".repeat(desiredFenceLength)}`
  ].join("\n");
}
__name(appendEscapedMarkdownCodeBlockFence, "appendEscapedMarkdownCodeBlockFence");
function appendEscapedMarkdownInlineCode(text) {
  const longestBacktickRun = Math.max(0, ...(text.match(/`+/g) ?? []).map((m) => m.length));
  const fence = "`".repeat(longestBacktickRun + 1);
  const needsSpace = text.startsWith("`") || text.endsWith("`");
  const content = needsSpace ? ` ${text} ` : text;
  return `${fence}${content}${fence}`;
}
__name(appendEscapedMarkdownInlineCode, "appendEscapedMarkdownInlineCode");
function escapeDoubleQuotes(input) {
  return input.replace(/"/g, "&quot;");
}
__name(escapeDoubleQuotes, "escapeDoubleQuotes");
function removeMarkdownEscapes(text) {
  if (!text) {
    return text;
  }
  return text.replace(/\\([\\`*_{}[\]()#+\-.!~])/g, "$1");
}
__name(removeMarkdownEscapes, "removeMarkdownEscapes");
function parseHrefAndDimensions(href) {
  const dimensions = [];
  const splitted = href.split("|").map((s) => s.trim());
  href = splitted[0];
  const parameters = splitted[1];
  if (parameters) {
    const heightFromParams = /height=(\d+)/.exec(parameters);
    const widthFromParams = /width=(\d+)/.exec(parameters);
    const height = heightFromParams ? heightFromParams[1] : "";
    const width = widthFromParams ? widthFromParams[1] : "";
    const widthIsFinite = isFinite(parseInt(width));
    const heightIsFinite = isFinite(parseInt(height));
    if (widthIsFinite) {
      dimensions.push(`width="${width}"`);
    }
    if (heightIsFinite) {
      dimensions.push(`height="${height}"`);
    }
  }
  return { href, dimensions };
}
__name(parseHrefAndDimensions, "parseHrefAndDimensions");
function createMarkdownLink(text, href, title, escapeTokens = true) {
  return `[${escapeTokens ? escapeMarkdownSyntaxTokens(text) : text}](${href}${title ? ` "${escapeMarkdownSyntaxTokens(title)}"` : ""})`;
}
__name(createMarkdownLink, "createMarkdownLink");
function createMarkdownCommandLink(command, escapeTokens = true) {
  const uri = createCommandUri(command.id, ...command.arguments || []).toString();
  return createMarkdownLink(command.text, uri, command.tooltip, escapeTokens);
}
__name(createMarkdownCommandLink, "createMarkdownCommandLink");
function createCommandUri(commandId, ...commandArgs) {
  return URI.from({
    scheme: Schemas.command,
    path: commandId,
    query: commandArgs.length ? encodeURIComponent(JSON.stringify(commandArgs)) : void 0
  });
}
__name(createCommandUri, "createCommandUri");

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/workbench/api/common/extHostTypes/markdownString.js
var __decorate = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MarkdownString_1;
var MarkdownString2 = MarkdownString_1 = class MarkdownString3 {
  static {
    __name(this, "MarkdownString");
  }
  #delegate;
  static isMarkdownString(thing) {
    if (thing instanceof MarkdownString_1) {
      return true;
    }
    if (!thing || typeof thing !== "object") {
      return false;
    }
    return thing.appendCodeblock && thing.appendMarkdown && thing.appendText && thing.value !== void 0;
  }
  constructor(value, supportThemeIcons = false) {
    this.#delegate = new MarkdownString(value, { supportThemeIcons });
  }
  get value() {
    return this.#delegate.value;
  }
  set value(value) {
    this.#delegate.value = value;
  }
  get isTrusted() {
    return this.#delegate.isTrusted;
  }
  set isTrusted(value) {
    this.#delegate.isTrusted = value;
  }
  get supportThemeIcons() {
    return this.#delegate.supportThemeIcons;
  }
  set supportThemeIcons(value) {
    this.#delegate.supportThemeIcons = value;
  }
  get supportHtml() {
    return this.#delegate.supportHtml;
  }
  set supportHtml(value) {
    this.#delegate.supportHtml = value;
  }
  get supportAlertSyntax() {
    return this.#delegate.supportAlertSyntax;
  }
  set supportAlertSyntax(value) {
    this.#delegate.supportAlertSyntax = value;
  }
  get baseUri() {
    return this.#delegate.baseUri;
  }
  set baseUri(value) {
    this.#delegate.baseUri = value;
  }
  appendText(value) {
    this.#delegate.appendText(value);
    return this;
  }
  appendMarkdown(value) {
    this.#delegate.appendMarkdown(value);
    return this;
  }
  appendCodeblock(value, language2) {
    this.#delegate.appendCodeblock(language2 ?? "", value);
    return this;
  }
};
MarkdownString2 = MarkdownString_1 = __decorate([
  es5ClassCompat
], MarkdownString2);

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/workbench/api/common/extHostTypes/position.js
var __decorate2 = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var Position_1;
var Position = Position_1 = class Position2 {
  static {
    __name(this, "Position");
  }
  static Min(...positions) {
    if (positions.length === 0) {
      throw new TypeError();
    }
    let result = positions[0];
    for (let i = 1; i < positions.length; i++) {
      const p = positions[i];
      if (p.isBefore(result)) {
        result = p;
      }
    }
    return result;
  }
  static Max(...positions) {
    if (positions.length === 0) {
      throw new TypeError();
    }
    let result = positions[0];
    for (let i = 1; i < positions.length; i++) {
      const p = positions[i];
      if (p.isAfter(result)) {
        result = p;
      }
    }
    return result;
  }
  static isPosition(other) {
    if (!other) {
      return false;
    }
    if (other instanceof Position_1) {
      return true;
    }
    const { line, character } = other;
    if (typeof line === "number" && typeof character === "number") {
      return true;
    }
    return false;
  }
  static of(obj) {
    if (obj instanceof Position_1) {
      return obj;
    } else if (this.isPosition(obj)) {
      return new Position_1(obj.line, obj.character);
    }
    throw new Error("Invalid argument, is NOT a position-like object");
  }
  get line() {
    return this._line;
  }
  get character() {
    return this._character;
  }
  constructor(line, character) {
    if (line < 0) {
      throw illegalArgument("line must be non-negative");
    }
    if (character < 0) {
      throw illegalArgument("character must be non-negative");
    }
    this._line = line;
    this._character = character;
  }
  isBefore(other) {
    if (this._line < other._line) {
      return true;
    }
    if (other._line < this._line) {
      return false;
    }
    return this._character < other._character;
  }
  isBeforeOrEqual(other) {
    if (this._line < other._line) {
      return true;
    }
    if (other._line < this._line) {
      return false;
    }
    return this._character <= other._character;
  }
  isAfter(other) {
    return !this.isBeforeOrEqual(other);
  }
  isAfterOrEqual(other) {
    return !this.isBefore(other);
  }
  isEqual(other) {
    return this._line === other._line && this._character === other._character;
  }
  compareTo(other) {
    if (this._line < other._line) {
      return -1;
    } else if (this._line > other.line) {
      return 1;
    } else {
      if (this._character < other._character) {
        return -1;
      } else if (this._character > other._character) {
        return 1;
      } else {
        return 0;
      }
    }
  }
  translate(lineDeltaOrChange, characterDelta = 0) {
    if (lineDeltaOrChange === null || characterDelta === null) {
      throw illegalArgument();
    }
    let lineDelta;
    if (typeof lineDeltaOrChange === "undefined") {
      lineDelta = 0;
    } else if (typeof lineDeltaOrChange === "number") {
      lineDelta = lineDeltaOrChange;
    } else {
      lineDelta = typeof lineDeltaOrChange.lineDelta === "number" ? lineDeltaOrChange.lineDelta : 0;
      characterDelta = typeof lineDeltaOrChange.characterDelta === "number" ? lineDeltaOrChange.characterDelta : 0;
    }
    if (lineDelta === 0 && characterDelta === 0) {
      return this;
    }
    return new Position_1(this.line + lineDelta, this.character + characterDelta);
  }
  with(lineOrChange, character = this.character) {
    if (lineOrChange === null || character === null) {
      throw illegalArgument();
    }
    let line;
    if (typeof lineOrChange === "undefined") {
      line = this.line;
    } else if (typeof lineOrChange === "number") {
      line = lineOrChange;
    } else {
      line = typeof lineOrChange.line === "number" ? lineOrChange.line : this.line;
      character = typeof lineOrChange.character === "number" ? lineOrChange.character : this.character;
    }
    if (line === this.line && character === this.character) {
      return this;
    }
    return new Position_1(line, character);
  }
  toJSON() {
    return { line: this.line, character: this.character };
  }
  [/* @__PURE__ */ Symbol.for("debug.description")]() {
    return `(${this.line}:${this.character})`;
  }
};
Position = Position_1 = __decorate2([
  es5ClassCompat
], Position);

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/workbench/api/common/extHostTypes/range.js
var __decorate3 = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var Range_1;
var Range = Range_1 = class Range2 {
  static {
    __name(this, "Range");
  }
  static isRange(thing) {
    if (thing instanceof Range_1) {
      return true;
    }
    if (!thing || typeof thing !== "object") {
      return false;
    }
    return Position.isPosition(thing.start) && Position.isPosition(thing.end);
  }
  static of(obj) {
    if (obj instanceof Range_1) {
      return obj;
    }
    if (this.isRange(obj)) {
      return new Range_1(obj.start, obj.end);
    }
    throw new Error("Invalid argument, is NOT a range-like object");
  }
  get start() {
    return this._start;
  }
  get end() {
    return this._end;
  }
  constructor(startLineOrStart, startColumnOrEnd, endLine, endColumn) {
    let start;
    let end;
    if (typeof startLineOrStart === "number" && typeof startColumnOrEnd === "number" && typeof endLine === "number" && typeof endColumn === "number") {
      start = new Position(startLineOrStart, startColumnOrEnd);
      end = new Position(endLine, endColumn);
    } else if (Position.isPosition(startLineOrStart) && Position.isPosition(startColumnOrEnd)) {
      start = Position.of(startLineOrStart);
      end = Position.of(startColumnOrEnd);
    }
    if (!start || !end) {
      throw new Error("Invalid arguments");
    }
    if (start.isBefore(end)) {
      this._start = start;
      this._end = end;
    } else {
      this._start = end;
      this._end = start;
    }
  }
  contains(positionOrRange) {
    if (Range_1.isRange(positionOrRange)) {
      return this.contains(positionOrRange.start) && this.contains(positionOrRange.end);
    } else if (Position.isPosition(positionOrRange)) {
      if (Position.of(positionOrRange).isBefore(this._start)) {
        return false;
      }
      if (this._end.isBefore(positionOrRange)) {
        return false;
      }
      return true;
    }
    return false;
  }
  isEqual(other) {
    return this._start.isEqual(other._start) && this._end.isEqual(other._end);
  }
  intersection(other) {
    const start = Position.Max(other.start, this._start);
    const end = Position.Min(other.end, this._end);
    if (start.isAfter(end)) {
      return void 0;
    }
    return new Range_1(start, end);
  }
  union(other) {
    if (this.contains(other)) {
      return this;
    } else if (other.contains(this)) {
      return other;
    }
    const start = Position.Min(other.start, this._start);
    const end = Position.Max(other.end, this.end);
    return new Range_1(start, end);
  }
  get isEmpty() {
    return this._start.isEqual(this._end);
  }
  get isSingleLine() {
    return this._start.line === this._end.line;
  }
  with(startOrChange, end = this.end) {
    if (startOrChange === null || end === null) {
      throw illegalArgument();
    }
    let start;
    if (!startOrChange) {
      start = this.start;
    } else if (Position.isPosition(startOrChange)) {
      start = startOrChange;
    } else {
      start = startOrChange.start || this.start;
      end = startOrChange.end || this.end;
    }
    if (start.isEqual(this._start) && end.isEqual(this.end)) {
      return this;
    }
    return new Range_1(start, end);
  }
  toJSON() {
    return [this.start, this.end];
  }
  [/* @__PURE__ */ Symbol.for("debug.description")]() {
    return getDebugDescriptionOfRange(this);
  }
};
Range = Range_1 = __decorate3([
  es5ClassCompat
], Range);
function getDebugDescriptionOfRange(range2) {
  return range2.isEmpty ? `[${range2.start.line}:${range2.start.character})` : `[${range2.start.line}:${range2.start.character} -> ${range2.end.line}:${range2.end.character})`;
}
__name(getDebugDescriptionOfRange, "getDebugDescriptionOfRange");

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/workbench/api/common/extHostTypes/codeActionKind.js
var __decorate4 = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var CodeActionKind_1;
var CodeActionKind = class CodeActionKind2 {
  static {
    __name(this, "CodeActionKind");
  }
  static {
    CodeActionKind_1 = this;
  }
  static {
    this.sep = ".";
  }
  constructor(value) {
    this.value = value;
  }
  append(parts) {
    return new CodeActionKind_1(this.value ? this.value + CodeActionKind_1.sep + parts : parts);
  }
  intersects(other) {
    return this.contains(other) || other.contains(this);
  }
  contains(other) {
    return this.value === other.value || other.value.startsWith(this.value + CodeActionKind_1.sep);
  }
};
CodeActionKind = CodeActionKind_1 = __decorate4([
  es5ClassCompat
], CodeActionKind);
CodeActionKind.Empty = new CodeActionKind("");
CodeActionKind.QuickFix = CodeActionKind.Empty.append("quickfix");
CodeActionKind.Refactor = CodeActionKind.Empty.append("refactor");
CodeActionKind.RefactorExtract = CodeActionKind.Refactor.append("extract");
CodeActionKind.RefactorInline = CodeActionKind.Refactor.append("inline");
CodeActionKind.RefactorMove = CodeActionKind.Refactor.append("move");
CodeActionKind.RefactorRewrite = CodeActionKind.Refactor.append("rewrite");
CodeActionKind.Source = CodeActionKind.Empty.append("source");
CodeActionKind.SourceOrganizeImports = CodeActionKind.Source.append("organizeImports");
CodeActionKind.SourceFixAll = CodeActionKind.Source.append("fixAll");
CodeActionKind.Notebook = CodeActionKind.Empty.append("notebook");

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/workbench/api/common/extHostTypes/diagnostic.js
var __decorate5 = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DiagnosticTag;
(function(DiagnosticTag2) {
  DiagnosticTag2[DiagnosticTag2["Unnecessary"] = 1] = "Unnecessary";
  DiagnosticTag2[DiagnosticTag2["Deprecated"] = 2] = "Deprecated";
})(DiagnosticTag || (DiagnosticTag = {}));
var DiagnosticSeverity;
(function(DiagnosticSeverity2) {
  DiagnosticSeverity2[DiagnosticSeverity2["Hint"] = 3] = "Hint";
  DiagnosticSeverity2[DiagnosticSeverity2["Information"] = 2] = "Information";
  DiagnosticSeverity2[DiagnosticSeverity2["Warning"] = 1] = "Warning";
  DiagnosticSeverity2[DiagnosticSeverity2["Error"] = 0] = "Error";
})(DiagnosticSeverity || (DiagnosticSeverity = {}));
var DiagnosticRelatedInformation = class DiagnosticRelatedInformation2 {
  static {
    __name(this, "DiagnosticRelatedInformation");
  }
  static is(thing) {
    if (!thing) {
      return false;
    }
    return typeof thing.message === "string" && thing.location && Range.isRange(thing.location.range) && URI.isUri(thing.location.uri);
  }
  constructor(location, message) {
    this.location = location;
    this.message = message;
  }
  static isEqual(a, b) {
    if (a === b) {
      return true;
    }
    if (!a || !b) {
      return false;
    }
    return a.message === b.message && a.location.range.isEqual(b.location.range) && a.location.uri.toString() === b.location.uri.toString();
  }
};
DiagnosticRelatedInformation = __decorate5([
  es5ClassCompat
], DiagnosticRelatedInformation);
var Diagnostic = class Diagnostic2 {
  static {
    __name(this, "Diagnostic");
  }
  constructor(range2, message, severity = DiagnosticSeverity.Error) {
    if (!Range.isRange(range2)) {
      throw new TypeError("range must be set");
    }
    if (!message) {
      throw new TypeError("message must be set");
    }
    this.range = range2;
    this.message = message;
    this.severity = severity;
  }
  toJSON() {
    return {
      severity: DiagnosticSeverity[this.severity],
      message: this.message,
      range: this.range,
      source: this.source,
      code: this.code
    };
  }
  static isEqual(a, b) {
    if (a === b) {
      return true;
    }
    if (!a || !b) {
      return false;
    }
    return a.message === b.message && a.severity === b.severity && a.code === b.code && a.severity === b.severity && a.source === b.source && a.range.isEqual(b.range) && equals(a.tags, b.tags) && equals(a.relatedInformation, b.relatedInformation, DiagnosticRelatedInformation.isEqual);
  }
};
Diagnostic = __decorate5([
  es5ClassCompat
], Diagnostic);

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/workbench/api/common/extHostTypes/location.js
var __decorate6 = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var Location_1;
var Location = Location_1 = class Location2 {
  static {
    __name(this, "Location");
  }
  static isLocation(thing) {
    if (thing instanceof Location_1) {
      return true;
    }
    if (!thing) {
      return false;
    }
    return Range.isRange(thing.range) && URI.isUri(thing.uri);
  }
  constructor(uri, rangeOrPosition) {
    this.uri = uri;
    if (!rangeOrPosition) {
    } else if (Range.isRange(rangeOrPosition)) {
      this.range = Range.of(rangeOrPosition);
    } else if (Position.isPosition(rangeOrPosition)) {
      this.range = new Range(rangeOrPosition, rangeOrPosition);
    } else {
      throw new Error("Illegal argument");
    }
  }
  toJSON() {
    return {
      uri: this.uri,
      range: this.range
    };
  }
};
Location = Location_1 = __decorate6([
  es5ClassCompat
], Location);

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/workbench/api/common/extHostTypes/notebooks.js
var __decorate7 = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var NotebookEdit_1;
var NotebookCellKind;
(function(NotebookCellKind2) {
  NotebookCellKind2[NotebookCellKind2["Markup"] = 1] = "Markup";
  NotebookCellKind2[NotebookCellKind2["Code"] = 2] = "Code";
})(NotebookCellKind || (NotebookCellKind = {}));
var NotebookRange = class _NotebookRange {
  static {
    __name(this, "NotebookRange");
  }
  static isNotebookRange(thing) {
    if (thing instanceof _NotebookRange) {
      return true;
    }
    if (!thing) {
      return false;
    }
    return typeof thing.start === "number" && typeof thing.end === "number";
  }
  get start() {
    return this._start;
  }
  get end() {
    return this._end;
  }
  get isEmpty() {
    return this._start === this._end;
  }
  constructor(start, end) {
    if (start < 0) {
      throw illegalArgument("start must be positive");
    }
    if (end < 0) {
      throw illegalArgument("end must be positive");
    }
    if (start <= end) {
      this._start = start;
      this._end = end;
    } else {
      this._start = end;
      this._end = start;
    }
  }
  with(change) {
    let start = this._start;
    let end = this._end;
    if (change.start !== void 0) {
      start = change.start;
    }
    if (change.end !== void 0) {
      end = change.end;
    }
    if (start === this._start && end === this._end) {
      return this;
    }
    return new _NotebookRange(start, end);
  }
};
var NotebookCellData = class _NotebookCellData {
  static {
    __name(this, "NotebookCellData");
  }
  static validate(data) {
    if (typeof data.kind !== "number") {
      throw new Error("NotebookCellData MUST have 'kind' property");
    }
    if (typeof data.value !== "string") {
      throw new Error("NotebookCellData MUST have 'value' property");
    }
    if (typeof data.languageId !== "string") {
      throw new Error("NotebookCellData MUST have 'languageId' property");
    }
  }
  static isNotebookCellDataArray(value) {
    return Array.isArray(value) && value.every((elem) => _NotebookCellData.isNotebookCellData(elem));
  }
  static isNotebookCellData(value) {
    return true;
  }
  constructor(kind, value, languageId, mime, outputs, metadata, executionSummary) {
    this.kind = kind;
    this.value = value;
    this.languageId = languageId;
    this.mime = mime;
    this.outputs = outputs ?? [];
    this.metadata = metadata;
    this.executionSummary = executionSummary;
    _NotebookCellData.validate(this);
  }
};
var NotebookData = class {
  static {
    __name(this, "NotebookData");
  }
  constructor(cells) {
    this.cells = cells;
  }
};
var NotebookEdit = NotebookEdit_1 = class NotebookEdit2 {
  static {
    __name(this, "NotebookEdit");
  }
  static isNotebookCellEdit(thing) {
    if (thing instanceof NotebookEdit_1) {
      return true;
    }
    if (!thing) {
      return false;
    }
    return NotebookRange.isNotebookRange(thing) && Array.isArray(thing.newCells);
  }
  static replaceCells(range2, newCells) {
    return new NotebookEdit_1(range2, newCells);
  }
  static insertCells(index2, newCells) {
    return new NotebookEdit_1(new NotebookRange(index2, index2), newCells);
  }
  static deleteCells(range2) {
    return new NotebookEdit_1(range2, []);
  }
  static updateCellMetadata(index2, newMetadata) {
    const edit = new NotebookEdit_1(new NotebookRange(index2, index2), []);
    edit.newCellMetadata = newMetadata;
    return edit;
  }
  static updateNotebookMetadata(newMetadata) {
    const edit = new NotebookEdit_1(new NotebookRange(0, 0), []);
    edit.newNotebookMetadata = newMetadata;
    return edit;
  }
  constructor(range2, newCells) {
    this.range = range2;
    this.newCells = newCells;
  }
};
NotebookEdit = NotebookEdit_1 = __decorate7([
  es5ClassCompat
], NotebookEdit);
var NotebookCellOutputItem = class _NotebookCellOutputItem {
  static {
    __name(this, "NotebookCellOutputItem");
  }
  static isNotebookCellOutputItem(obj) {
    if (obj instanceof _NotebookCellOutputItem) {
      return true;
    }
    if (!obj) {
      return false;
    }
    return typeof obj.mime === "string" && obj.data instanceof Uint8Array;
  }
  static error(err) {
    const obj = {
      name: err.name,
      message: err.message,
      stack: err.stack
    };
    return _NotebookCellOutputItem.json(obj, "application/vnd.code.notebook.error");
  }
  static stdout(value) {
    return _NotebookCellOutputItem.text(value, "application/vnd.code.notebook.stdout");
  }
  static stderr(value) {
    return _NotebookCellOutputItem.text(value, "application/vnd.code.notebook.stderr");
  }
  static bytes(value, mime = "application/octet-stream") {
    return new _NotebookCellOutputItem(value, mime);
  }
  static #encoder = new TextEncoder();
  static text(value, mime = Mimes.text) {
    const bytes = _NotebookCellOutputItem.#encoder.encode(String(value));
    return new _NotebookCellOutputItem(bytes, mime);
  }
  static json(value, mime = "text/x-json") {
    const rawStr = JSON.stringify(value, void 0, "	");
    return _NotebookCellOutputItem.text(rawStr, mime);
  }
  constructor(data, mime) {
    this.data = data;
    this.mime = mime;
    const mimeNormalized = normalizeMimeType(mime, true);
    if (!mimeNormalized) {
      throw new Error(`INVALID mime type: ${mime}. Must be in the format "type/subtype[;optionalparameter]"`);
    }
    this.mime = mimeNormalized;
  }
};
var NotebookCellOutput = class _NotebookCellOutput {
  static {
    __name(this, "NotebookCellOutput");
  }
  static isNotebookCellOutput(candidate) {
    if (candidate instanceof _NotebookCellOutput) {
      return true;
    }
    if (!candidate || typeof candidate !== "object") {
      return false;
    }
    return typeof candidate.id === "string" && Array.isArray(candidate.items);
  }
  static ensureUniqueMimeTypes(items, warn = false) {
    const seen = /* @__PURE__ */ new Set();
    const removeIdx = /* @__PURE__ */ new Set();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const normalMime = normalizeMimeType(item.mime);
      if (!seen.has(normalMime) || isTextStreamMime(normalMime)) {
        seen.add(normalMime);
        continue;
      }
      removeIdx.add(i);
      if (warn) {
        console.warn(`DUPLICATED mime type '${item.mime}' will be dropped`);
      }
    }
    if (removeIdx.size === 0) {
      return items;
    }
    return items.filter((_item, index2) => !removeIdx.has(index2));
  }
  constructor(items, idOrMetadata, metadata) {
    this.items = _NotebookCellOutput.ensureUniqueMimeTypes(items, true);
    if (typeof idOrMetadata === "string") {
      this.id = idOrMetadata;
      this.metadata = metadata;
    } else {
      this.id = generateUuid();
      this.metadata = idOrMetadata ?? metadata;
    }
  }
};

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/workbench/api/common/extHostTypes/selection.js
var __decorate8 = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var Selection_1;
var Selection = Selection_1 = class Selection2 extends Range {
  static {
    __name(this, "Selection");
  }
  static isSelection(thing) {
    if (thing instanceof Selection_1) {
      return true;
    }
    if (!thing || typeof thing !== "object") {
      return false;
    }
    return Range.isRange(thing) && Position.isPosition(thing.anchor) && Position.isPosition(thing.active) && typeof thing.isReversed === "boolean";
  }
  get anchor() {
    return this._anchor;
  }
  get active() {
    return this._active;
  }
  constructor(anchorLineOrAnchor, anchorColumnOrActive, activeLine, activeColumn) {
    let anchor;
    let active;
    if (typeof anchorLineOrAnchor === "number" && typeof anchorColumnOrActive === "number" && typeof activeLine === "number" && typeof activeColumn === "number") {
      anchor = new Position(anchorLineOrAnchor, anchorColumnOrActive);
      active = new Position(activeLine, activeColumn);
    } else if (Position.isPosition(anchorLineOrAnchor) && Position.isPosition(anchorColumnOrActive)) {
      anchor = Position.of(anchorLineOrAnchor);
      active = Position.of(anchorColumnOrActive);
    }
    if (!anchor || !active) {
      throw new Error("Invalid arguments");
    }
    super(anchor, active);
    this._anchor = anchor;
    this._active = active;
  }
  get isReversed() {
    return this._anchor === this._end;
  }
  toJSON() {
    return {
      start: this.start,
      end: this.end,
      active: this.active,
      anchor: this.anchor
    };
  }
  [/* @__PURE__ */ Symbol.for("debug.description")]() {
    return getDebugDescriptionOfSelection(this);
  }
};
Selection = Selection_1 = __decorate8([
  es5ClassCompat
], Selection);
function getDebugDescriptionOfSelection(selection) {
  let rangeStr = getDebugDescriptionOfRange(selection);
  if (!selection.isEmpty) {
    if (selection.active.isEqual(selection.start)) {
      rangeStr = `|${rangeStr}`;
    } else {
      rangeStr = `${rangeStr}|`;
    }
  }
  return rangeStr;
}
__name(getDebugDescriptionOfSelection, "getDebugDescriptionOfSelection");

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/workbench/api/common/extHostTypes/snippetString.js
var __decorate9 = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SnippetString_1;
var SnippetString = SnippetString_1 = class SnippetString2 {
  static {
    __name(this, "SnippetString");
  }
  static isSnippetString(thing) {
    if (thing instanceof SnippetString_1) {
      return true;
    }
    if (!thing || typeof thing !== "object") {
      return false;
    }
    return typeof thing.value === "string";
  }
  static _escape(value) {
    return value.replace(/\$|}|\\/g, "\\$&");
  }
  constructor(value) {
    this._tabstop = 1;
    this.value = value || "";
  }
  appendText(string) {
    this.value += SnippetString_1._escape(string);
    return this;
  }
  appendTabstop(number = this._tabstop++) {
    this.value += "$";
    this.value += number;
    return this;
  }
  appendPlaceholder(value, number = this._tabstop++) {
    if (typeof value === "function") {
      const nested = new SnippetString_1();
      nested._tabstop = this._tabstop;
      value(nested);
      this._tabstop = nested._tabstop;
      value = nested.value;
    } else {
      value = SnippetString_1._escape(value);
    }
    this.value += "${";
    this.value += number;
    this.value += ":";
    this.value += value;
    this.value += "}";
    return this;
  }
  appendChoice(values, number = this._tabstop++) {
    const value = values.map((s) => s.replaceAll(/[|\\,]/g, "\\$&")).join(",");
    this.value += "${";
    this.value += number;
    this.value += "|";
    this.value += value;
    this.value += "|}";
    return this;
  }
  appendVariable(name, defaultValue) {
    if (typeof defaultValue === "function") {
      const nested = new SnippetString_1();
      nested._tabstop = this._tabstop;
      defaultValue(nested);
      this._tabstop = nested._tabstop;
      defaultValue = nested.value;
    } else if (typeof defaultValue === "string") {
      defaultValue = defaultValue.replace(/\$|}/g, "\\$&");
    }
    this.value += "${";
    this.value += name;
    if (defaultValue) {
      this.value += ":";
      this.value += defaultValue;
    }
    this.value += "}";
    return this;
  }
};
SnippetString = SnippetString_1 = __decorate9([
  es5ClassCompat
], SnippetString);

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/workbench/api/common/extHostTypes/snippetTextEdit.js
var SnippetTextEdit = class _SnippetTextEdit {
  static {
    __name(this, "SnippetTextEdit");
  }
  static isSnippetTextEdit(thing) {
    if (thing instanceof _SnippetTextEdit) {
      return true;
    }
    if (!thing) {
      return false;
    }
    return Range.isRange(thing.range) && SnippetString.isSnippetString(thing.snippet);
  }
  static replace(range2, snippet) {
    return new _SnippetTextEdit(range2, snippet);
  }
  static insert(position, snippet) {
    return _SnippetTextEdit.replace(new Range(position, position), snippet);
  }
  constructor(range2, snippet) {
    this.range = range2;
    this.snippet = snippet;
  }
};

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/workbench/api/common/extHostTypes/symbolInformation.js
var __decorate10 = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SymbolInformation_1;
var SymbolKind;
(function(SymbolKind2) {
  SymbolKind2[SymbolKind2["File"] = 0] = "File";
  SymbolKind2[SymbolKind2["Module"] = 1] = "Module";
  SymbolKind2[SymbolKind2["Namespace"] = 2] = "Namespace";
  SymbolKind2[SymbolKind2["Package"] = 3] = "Package";
  SymbolKind2[SymbolKind2["Class"] = 4] = "Class";
  SymbolKind2[SymbolKind2["Method"] = 5] = "Method";
  SymbolKind2[SymbolKind2["Property"] = 6] = "Property";
  SymbolKind2[SymbolKind2["Field"] = 7] = "Field";
  SymbolKind2[SymbolKind2["Constructor"] = 8] = "Constructor";
  SymbolKind2[SymbolKind2["Enum"] = 9] = "Enum";
  SymbolKind2[SymbolKind2["Interface"] = 10] = "Interface";
  SymbolKind2[SymbolKind2["Function"] = 11] = "Function";
  SymbolKind2[SymbolKind2["Variable"] = 12] = "Variable";
  SymbolKind2[SymbolKind2["Constant"] = 13] = "Constant";
  SymbolKind2[SymbolKind2["String"] = 14] = "String";
  SymbolKind2[SymbolKind2["Number"] = 15] = "Number";
  SymbolKind2[SymbolKind2["Boolean"] = 16] = "Boolean";
  SymbolKind2[SymbolKind2["Array"] = 17] = "Array";
  SymbolKind2[SymbolKind2["Object"] = 18] = "Object";
  SymbolKind2[SymbolKind2["Key"] = 19] = "Key";
  SymbolKind2[SymbolKind2["Null"] = 20] = "Null";
  SymbolKind2[SymbolKind2["EnumMember"] = 21] = "EnumMember";
  SymbolKind2[SymbolKind2["Struct"] = 22] = "Struct";
  SymbolKind2[SymbolKind2["Event"] = 23] = "Event";
  SymbolKind2[SymbolKind2["Operator"] = 24] = "Operator";
  SymbolKind2[SymbolKind2["TypeParameter"] = 25] = "TypeParameter";
})(SymbolKind || (SymbolKind = {}));
var SymbolTag;
(function(SymbolTag2) {
  SymbolTag2[SymbolTag2["Deprecated"] = 1] = "Deprecated";
})(SymbolTag || (SymbolTag = {}));
var SymbolInformation = SymbolInformation_1 = class SymbolInformation2 {
  static {
    __name(this, "SymbolInformation");
  }
  static validate(candidate) {
    if (!candidate.name) {
      throw new Error("name must not be falsy");
    }
  }
  constructor(name, kind, rangeOrContainer, locationOrUri, containerName) {
    this.name = name;
    this.kind = kind;
    this.containerName = containerName;
    if (typeof rangeOrContainer === "string") {
      this.containerName = rangeOrContainer;
    }
    if (locationOrUri instanceof Location) {
      this.location = locationOrUri;
    } else if (rangeOrContainer instanceof Range) {
      this.location = new Location(locationOrUri, rangeOrContainer);
    }
    SymbolInformation_1.validate(this);
  }
  toJSON() {
    return {
      name: this.name,
      kind: SymbolKind[this.kind],
      location: this.location,
      containerName: this.containerName
    };
  }
};
SymbolInformation = SymbolInformation_1 = __decorate10([
  es5ClassCompat
], SymbolInformation);

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/workbench/api/common/extHostTypes/textEdit.js
var __decorate11 = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TextEdit_1;
var EndOfLine;
(function(EndOfLine2) {
  EndOfLine2[EndOfLine2["LF"] = 1] = "LF";
  EndOfLine2[EndOfLine2["CRLF"] = 2] = "CRLF";
})(EndOfLine || (EndOfLine = {}));
var TextEdit = TextEdit_1 = class TextEdit2 {
  static {
    __name(this, "TextEdit");
  }
  static isTextEdit(thing) {
    if (thing instanceof TextEdit_1) {
      return true;
    }
    if (!thing || typeof thing !== "object") {
      return false;
    }
    return Range.isRange(thing) && typeof thing.newText === "string";
  }
  static replace(range2, newText) {
    return new TextEdit_1(range2, newText);
  }
  static insert(position, newText) {
    return TextEdit_1.replace(new Range(position, position), newText);
  }
  static delete(range2) {
    return TextEdit_1.replace(range2, "");
  }
  static setEndOfLine(eol) {
    const ret = new TextEdit_1(new Range(new Position(0, 0), new Position(0, 0)), "");
    ret.newEol = eol;
    return ret;
  }
  get range() {
    return this._range;
  }
  set range(value) {
    if (value && !Range.isRange(value)) {
      throw illegalArgument("range");
    }
    this._range = value;
  }
  get newText() {
    return this._newText || "";
  }
  set newText(value) {
    if (value && typeof value !== "string") {
      throw illegalArgument("newText");
    }
    this._newText = value;
  }
  get newEol() {
    return this._newEol;
  }
  set newEol(value) {
    if (value && typeof value !== "number") {
      throw illegalArgument("newEol");
    }
    this._newEol = value;
  }
  constructor(range2, newText) {
    this._range = range2;
    this._newText = newText;
  }
  toJSON() {
    return {
      range: this.range,
      newText: this.newText,
      newEol: this._newEol
    };
  }
};
TextEdit = TextEdit_1 = __decorate11([
  es5ClassCompat
], TextEdit);

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/workbench/api/common/extHostTypes/workspaceEdit.js
var __decorate12 = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var FileEditType;
(function(FileEditType2) {
  FileEditType2[FileEditType2["File"] = 1] = "File";
  FileEditType2[FileEditType2["Text"] = 2] = "Text";
  FileEditType2[FileEditType2["Cell"] = 3] = "Cell";
  FileEditType2[FileEditType2["CellReplace"] = 5] = "CellReplace";
  FileEditType2[FileEditType2["Snippet"] = 6] = "Snippet";
})(FileEditType || (FileEditType = {}));
var WorkspaceEdit = class WorkspaceEdit2 {
  static {
    __name(this, "WorkspaceEdit");
  }
  constructor() {
    this._edits = [];
  }
  _allEntries() {
    return this._edits;
  }
  // --- file
  renameFile(from, to, options, metadata) {
    this._edits.push({ _type: 1, from, to, options, metadata });
  }
  createFile(uri, options, metadata) {
    this._edits.push({ _type: 1, from: void 0, to: uri, options, metadata });
  }
  deleteFile(uri, options, metadata) {
    this._edits.push({ _type: 1, from: uri, to: void 0, options, metadata });
  }
  // --- notebook
  replaceNotebookMetadata(uri, value, metadata) {
    this._edits.push({ _type: 3, metadata, uri, edit: { editType: 5, metadata: value } });
  }
  replaceNotebookCells(uri, startOrRange, cellData, metadata) {
    const start = startOrRange.start;
    const end = startOrRange.end;
    if (start !== end || cellData.length > 0) {
      this._edits.push({ _type: 5, uri, index: start, count: end - start, cells: cellData, metadata });
    }
  }
  replaceNotebookCellMetadata(uri, index2, cellMetadata, metadata) {
    this._edits.push({ _type: 3, metadata, uri, edit: { editType: 3, index: index2, metadata: cellMetadata } });
  }
  // --- text
  replace(uri, range2, newText, metadata) {
    this._edits.push({ _type: 2, uri, edit: new TextEdit(range2, newText), metadata });
  }
  insert(resource, position, newText, metadata) {
    this.replace(resource, new Range(position, position), newText, metadata);
  }
  delete(resource, range2, metadata) {
    this.replace(resource, range2, "", metadata);
  }
  // --- text (Maplike)
  has(uri) {
    return this._edits.some((edit) => edit._type === 2 && edit.uri.toString() === uri.toString());
  }
  set(uri, edits) {
    if (!edits) {
      for (let i = 0; i < this._edits.length; i++) {
        const element = this._edits[i];
        switch (element._type) {
          case 2:
          case 6:
          case 3:
          case 5:
            if (element.uri.toString() === uri.toString()) {
              this._edits[i] = void 0;
            }
            break;
        }
      }
      coalesceInPlace(this._edits);
    } else {
      for (const editOrTuple of edits) {
        if (!editOrTuple) {
          continue;
        }
        let edit;
        let metadata;
        if (Array.isArray(editOrTuple)) {
          edit = editOrTuple[0];
          metadata = editOrTuple[1];
        } else {
          edit = editOrTuple;
        }
        if (NotebookEdit.isNotebookCellEdit(edit)) {
          if (edit.newCellMetadata) {
            this.replaceNotebookCellMetadata(uri, edit.range.start, edit.newCellMetadata, metadata);
          } else if (edit.newNotebookMetadata) {
            this.replaceNotebookMetadata(uri, edit.newNotebookMetadata, metadata);
          } else {
            this.replaceNotebookCells(uri, edit.range, edit.newCells, metadata);
          }
        } else if (SnippetTextEdit.isSnippetTextEdit(edit)) {
          this._edits.push({ _type: 6, uri, range: edit.range, edit: edit.snippet, metadata, keepWhitespace: edit.keepWhitespace });
        } else {
          this._edits.push({ _type: 2, uri, edit, metadata });
        }
      }
    }
  }
  get(uri) {
    const res = [];
    for (const candidate of this._edits) {
      if (candidate._type === 2 && candidate.uri.toString() === uri.toString()) {
        res.push(candidate.edit);
      }
    }
    return res;
  }
  entries() {
    const textEdits = new ResourceMap();
    for (const candidate of this._edits) {
      if (candidate._type === 2) {
        let textEdit = textEdits.get(candidate.uri);
        if (!textEdit) {
          textEdit = [candidate.uri, []];
          textEdits.set(candidate.uri, textEdit);
        }
        textEdit[1].push(candidate.edit);
      }
    }
    return [...textEdits.values()];
  }
  get size() {
    return this.entries().length;
  }
  toJSON() {
    return this.entries();
  }
};
WorkspaceEdit = __decorate12([
  es5ClassCompat
], WorkspaceEdit);

// ../../Dependency/Microsoft/Dependency/Editor/out/vs/workbench/api/common/extHostTypes.js
var __decorate13 = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var Disposable_1, DocumentSymbol_1, TaskGroup_1, Task_1, TreeItem_1, FileSystemError_1, TestMessage_1;
var TerminalOutputAnchor;
(function(TerminalOutputAnchor2) {
  TerminalOutputAnchor2[TerminalOutputAnchor2["Top"] = 0] = "Top";
  TerminalOutputAnchor2[TerminalOutputAnchor2["Bottom"] = 1] = "Bottom";
})(TerminalOutputAnchor || (TerminalOutputAnchor = {}));
var TerminalQuickFixType;
(function(TerminalQuickFixType2) {
  TerminalQuickFixType2[TerminalQuickFixType2["TerminalCommand"] = 0] = "TerminalCommand";
  TerminalQuickFixType2[TerminalQuickFixType2["Opener"] = 1] = "Opener";
  TerminalQuickFixType2[TerminalQuickFixType2["Command"] = 3] = "Command";
})(TerminalQuickFixType || (TerminalQuickFixType = {}));
var Disposable2 = Disposable_1 = class Disposable3 {
  static {
    __name(this, "Disposable");
  }
  static from(...inDisposables) {
    let disposables = inDisposables;
    return new Disposable_1(function() {
      if (disposables) {
        for (const disposable of disposables) {
          if (disposable && typeof disposable.dispose === "function") {
            disposable.dispose();
          }
        }
        disposables = void 0;
      }
    });
  }
  #callOnDispose;
  constructor(callOnDispose) {
    this.#callOnDispose = callOnDispose;
  }
  dispose() {
    if (typeof this.#callOnDispose === "function") {
      this.#callOnDispose();
      this.#callOnDispose = void 0;
    }
  }
};
Disposable2 = Disposable_1 = __decorate13([
  es5ClassCompat
], Disposable2);
var validateConnectionToken = /* @__PURE__ */ __name((connectionToken) => {
  if (typeof connectionToken !== "string" || connectionToken.length === 0 || !/^[0-9A-Za-z_\-]+$/.test(connectionToken)) {
    throw illegalArgument("connectionToken");
  }
}, "validateConnectionToken");
var ResolvedAuthority = class {
  static {
    __name(this, "ResolvedAuthority");
  }
  static isResolvedAuthority(resolvedAuthority) {
    return resolvedAuthority && typeof resolvedAuthority === "object" && typeof resolvedAuthority.host === "string" && typeof resolvedAuthority.port === "number" && (resolvedAuthority.connectionToken === void 0 || typeof resolvedAuthority.connectionToken === "string");
  }
  constructor(host, port, connectionToken) {
    if (typeof host !== "string" || host.length === 0) {
      throw illegalArgument("host");
    }
    if (typeof port !== "number" || port === 0 || Math.round(port) !== port) {
      throw illegalArgument("port");
    }
    if (typeof connectionToken !== "undefined") {
      validateConnectionToken(connectionToken);
    }
    this.host = host;
    this.port = Math.round(port);
    this.connectionToken = connectionToken;
  }
};
var ManagedResolvedAuthority = class {
  static {
    __name(this, "ManagedResolvedAuthority");
  }
  static isManagedResolvedAuthority(resolvedAuthority) {
    return resolvedAuthority && typeof resolvedAuthority === "object" && typeof resolvedAuthority.makeConnection === "function" && (resolvedAuthority.connectionToken === void 0 || typeof resolvedAuthority.connectionToken === "string");
  }
  constructor(makeConnection, connectionToken) {
    this.makeConnection = makeConnection;
    this.connectionToken = connectionToken;
    if (typeof connectionToken !== "undefined") {
      validateConnectionToken(connectionToken);
    }
  }
};
var RemoteAuthorityResolverError2 = class _RemoteAuthorityResolverError extends Error {
  static {
    __name(this, "RemoteAuthorityResolverError");
  }
  static NotAvailable(message, handled) {
    return new _RemoteAuthorityResolverError(message, RemoteAuthorityResolverErrorCode.NotAvailable, handled);
  }
  static TemporarilyNotAvailable(message) {
    return new _RemoteAuthorityResolverError(message, RemoteAuthorityResolverErrorCode.TemporarilyNotAvailable);
  }
  constructor(message, code = RemoteAuthorityResolverErrorCode.Unknown, detail) {
    super(message);
    this._message = message;
    this._code = code;
    this._detail = detail;
    Object.setPrototypeOf(this, _RemoteAuthorityResolverError.prototype);
  }
};
var EnvironmentVariableMutatorType;
(function(EnvironmentVariableMutatorType2) {
  EnvironmentVariableMutatorType2[EnvironmentVariableMutatorType2["Replace"] = 1] = "Replace";
  EnvironmentVariableMutatorType2[EnvironmentVariableMutatorType2["Append"] = 2] = "Append";
  EnvironmentVariableMutatorType2[EnvironmentVariableMutatorType2["Prepend"] = 3] = "Prepend";
})(EnvironmentVariableMutatorType || (EnvironmentVariableMutatorType = {}));
var Hover = class Hover2 {
  static {
    __name(this, "Hover");
  }
  constructor(contents, range2) {
    if (!contents) {
      throw new Error("Illegal argument, contents must be defined");
    }
    if (Array.isArray(contents)) {
      this.contents = contents;
    } else {
      this.contents = [contents];
    }
    this.range = range2;
  }
};
Hover = __decorate13([
  es5ClassCompat
], Hover);
var VerboseHover = class VerboseHover2 extends Hover {
  static {
    __name(this, "VerboseHover");
  }
  constructor(contents, range2, canIncreaseVerbosity, canDecreaseVerbosity) {
    super(contents, range2);
    this.canIncreaseVerbosity = canIncreaseVerbosity;
    this.canDecreaseVerbosity = canDecreaseVerbosity;
  }
};
VerboseHover = __decorate13([
  es5ClassCompat
], VerboseHover);
var HoverVerbosityAction;
(function(HoverVerbosityAction2) {
  HoverVerbosityAction2[HoverVerbosityAction2["Increase"] = 0] = "Increase";
  HoverVerbosityAction2[HoverVerbosityAction2["Decrease"] = 1] = "Decrease";
})(HoverVerbosityAction || (HoverVerbosityAction = {}));
var DocumentHighlightKind;
(function(DocumentHighlightKind2) {
  DocumentHighlightKind2[DocumentHighlightKind2["Text"] = 0] = "Text";
  DocumentHighlightKind2[DocumentHighlightKind2["Read"] = 1] = "Read";
  DocumentHighlightKind2[DocumentHighlightKind2["Write"] = 2] = "Write";
})(DocumentHighlightKind || (DocumentHighlightKind = {}));
var DocumentHighlight = class DocumentHighlight2 {
  static {
    __name(this, "DocumentHighlight");
  }
  constructor(range2, kind = DocumentHighlightKind.Text) {
    this.range = range2;
    this.kind = kind;
  }
  toJSON() {
    return {
      range: this.range,
      kind: DocumentHighlightKind[this.kind]
    };
  }
};
DocumentHighlight = __decorate13([
  es5ClassCompat
], DocumentHighlight);
var MultiDocumentHighlight = class MultiDocumentHighlight2 {
  static {
    __name(this, "MultiDocumentHighlight");
  }
  constructor(uri, highlights) {
    this.uri = uri;
    this.highlights = highlights;
  }
  toJSON() {
    return {
      uri: this.uri,
      highlights: this.highlights.map((h) => h.toJSON())
    };
  }
};
MultiDocumentHighlight = __decorate13([
  es5ClassCompat
], MultiDocumentHighlight);
var DocumentSymbol = DocumentSymbol_1 = class DocumentSymbol2 {
  static {
    __name(this, "DocumentSymbol");
  }
  static validate(candidate) {
    if (!candidate.name) {
      throw new Error("name must not be falsy");
    }
    if (!candidate.range.contains(candidate.selectionRange)) {
      throw new Error("selectionRange must be contained in fullRange");
    }
    candidate.children?.forEach(DocumentSymbol_1.validate);
  }
  constructor(name, detail, kind, range2, selectionRange) {
    this.name = name;
    this.detail = detail;
    this.kind = kind;
    this.range = range2;
    this.selectionRange = selectionRange;
    this.children = [];
    DocumentSymbol_1.validate(this);
  }
};
DocumentSymbol = DocumentSymbol_1 = __decorate13([
  es5ClassCompat
], DocumentSymbol);
var CodeActionTriggerKind;
(function(CodeActionTriggerKind2) {
  CodeActionTriggerKind2[CodeActionTriggerKind2["Invoke"] = 1] = "Invoke";
  CodeActionTriggerKind2[CodeActionTriggerKind2["Automatic"] = 2] = "Automatic";
})(CodeActionTriggerKind || (CodeActionTriggerKind = {}));
var CodeAction = class CodeAction2 {
  static {
    __name(this, "CodeAction");
  }
  constructor(title, kind) {
    this.title = title;
    this.kind = kind;
  }
};
CodeAction = __decorate13([
  es5ClassCompat
], CodeAction);
var SelectionRange = class SelectionRange2 {
  static {
    __name(this, "SelectionRange");
  }
  constructor(range2, parent) {
    this.range = range2;
    this.parent = parent;
    if (parent && !parent.range.contains(this.range)) {
      throw new Error("Invalid argument: parent must contain this range");
    }
  }
};
SelectionRange = __decorate13([
  es5ClassCompat
], SelectionRange);
var CallHierarchyItem = class {
  static {
    __name(this, "CallHierarchyItem");
  }
  constructor(kind, name, detail, uri, range2, selectionRange) {
    this.kind = kind;
    this.name = name;
    this.detail = detail;
    this.uri = uri;
    this.range = range2;
    this.selectionRange = selectionRange;
  }
};
var CallHierarchyIncomingCall = class {
  static {
    __name(this, "CallHierarchyIncomingCall");
  }
  constructor(item, fromRanges) {
    this.fromRanges = fromRanges;
    this.from = item;
  }
};
var CallHierarchyOutgoingCall = class {
  static {
    __name(this, "CallHierarchyOutgoingCall");
  }
  constructor(item, fromRanges) {
    this.fromRanges = fromRanges;
    this.to = item;
  }
};
var LanguageStatusSeverity;
(function(LanguageStatusSeverity2) {
  LanguageStatusSeverity2[LanguageStatusSeverity2["Information"] = 0] = "Information";
  LanguageStatusSeverity2[LanguageStatusSeverity2["Warning"] = 1] = "Warning";
  LanguageStatusSeverity2[LanguageStatusSeverity2["Error"] = 2] = "Error";
})(LanguageStatusSeverity || (LanguageStatusSeverity = {}));
var CodeLens = class CodeLens2 {
  static {
    __name(this, "CodeLens");
  }
  constructor(range2, command) {
    this.range = range2;
    this.command = command;
  }
  get isResolved() {
    return !!this.command;
  }
};
CodeLens = __decorate13([
  es5ClassCompat
], CodeLens);
var ParameterInformation = class ParameterInformation2 {
  static {
    __name(this, "ParameterInformation");
  }
  constructor(label, documentation) {
    this.label = label;
    this.documentation = documentation;
  }
};
ParameterInformation = __decorate13([
  es5ClassCompat
], ParameterInformation);
var SignatureInformation = class SignatureInformation2 {
  static {
    __name(this, "SignatureInformation");
  }
  constructor(label, documentation) {
    this.label = label;
    this.documentation = documentation;
    this.parameters = [];
  }
};
SignatureInformation = __decorate13([
  es5ClassCompat
], SignatureInformation);
var SignatureHelp = class SignatureHelp2 {
  static {
    __name(this, "SignatureHelp");
  }
  constructor() {
    this.activeSignature = 0;
    this.activeParameter = 0;
    this.signatures = [];
  }
};
SignatureHelp = __decorate13([
  es5ClassCompat
], SignatureHelp);
var SignatureHelpTriggerKind;
(function(SignatureHelpTriggerKind2) {
  SignatureHelpTriggerKind2[SignatureHelpTriggerKind2["Invoke"] = 1] = "Invoke";
  SignatureHelpTriggerKind2[SignatureHelpTriggerKind2["TriggerCharacter"] = 2] = "TriggerCharacter";
  SignatureHelpTriggerKind2[SignatureHelpTriggerKind2["ContentChange"] = 3] = "ContentChange";
})(SignatureHelpTriggerKind || (SignatureHelpTriggerKind = {}));
var InlayHintKind;
(function(InlayHintKind2) {
  InlayHintKind2[InlayHintKind2["Type"] = 1] = "Type";
  InlayHintKind2[InlayHintKind2["Parameter"] = 2] = "Parameter";
})(InlayHintKind || (InlayHintKind = {}));
var InlayHintLabelPart = class InlayHintLabelPart2 {
  static {
    __name(this, "InlayHintLabelPart");
  }
  constructor(value) {
    this.value = value;
  }
};
InlayHintLabelPart = __decorate13([
  es5ClassCompat
], InlayHintLabelPart);
var InlayHint = class InlayHint2 {
  static {
    __name(this, "InlayHint");
  }
  constructor(position, label, kind) {
    this.position = position;
    this.label = label;
    this.kind = kind;
  }
};
InlayHint = __decorate13([
  es5ClassCompat
], InlayHint);
var CompletionTriggerKind;
(function(CompletionTriggerKind2) {
  CompletionTriggerKind2[CompletionTriggerKind2["Invoke"] = 0] = "Invoke";
  CompletionTriggerKind2[CompletionTriggerKind2["TriggerCharacter"] = 1] = "TriggerCharacter";
  CompletionTriggerKind2[CompletionTriggerKind2["TriggerForIncompleteCompletions"] = 2] = "TriggerForIncompleteCompletions";
})(CompletionTriggerKind || (CompletionTriggerKind = {}));
var CompletionItemKind;
(function(CompletionItemKind2) {
  CompletionItemKind2[CompletionItemKind2["Text"] = 0] = "Text";
  CompletionItemKind2[CompletionItemKind2["Method"] = 1] = "Method";
  CompletionItemKind2[CompletionItemKind2["Function"] = 2] = "Function";
  CompletionItemKind2[CompletionItemKind2["Constructor"] = 3] = "Constructor";
  CompletionItemKind2[CompletionItemKind2["Field"] = 4] = "Field";
  CompletionItemKind2[CompletionItemKind2["Variable"] = 5] = "Variable";
  CompletionItemKind2[CompletionItemKind2["Class"] = 6] = "Class";
  CompletionItemKind2[CompletionItemKind2["Interface"] = 7] = "Interface";
  CompletionItemKind2[CompletionItemKind2["Module"] = 8] = "Module";
  CompletionItemKind2[CompletionItemKind2["Property"] = 9] = "Property";
  CompletionItemKind2[CompletionItemKind2["Unit"] = 10] = "Unit";
  CompletionItemKind2[CompletionItemKind2["Value"] = 11] = "Value";
  CompletionItemKind2[CompletionItemKind2["Enum"] = 12] = "Enum";
  CompletionItemKind2[CompletionItemKind2["Keyword"] = 13] = "Keyword";
  CompletionItemKind2[CompletionItemKind2["Snippet"] = 14] = "Snippet";
  CompletionItemKind2[CompletionItemKind2["Color"] = 15] = "Color";
  CompletionItemKind2[CompletionItemKind2["File"] = 16] = "File";
  CompletionItemKind2[CompletionItemKind2["Reference"] = 17] = "Reference";
  CompletionItemKind2[CompletionItemKind2["Folder"] = 18] = "Folder";
  CompletionItemKind2[CompletionItemKind2["EnumMember"] = 19] = "EnumMember";
  CompletionItemKind2[CompletionItemKind2["Constant"] = 20] = "Constant";
  CompletionItemKind2[CompletionItemKind2["Struct"] = 21] = "Struct";
  CompletionItemKind2[CompletionItemKind2["Event"] = 22] = "Event";
  CompletionItemKind2[CompletionItemKind2["Operator"] = 23] = "Operator";
  CompletionItemKind2[CompletionItemKind2["TypeParameter"] = 24] = "TypeParameter";
  CompletionItemKind2[CompletionItemKind2["User"] = 25] = "User";
  CompletionItemKind2[CompletionItemKind2["Issue"] = 26] = "Issue";
})(CompletionItemKind || (CompletionItemKind = {}));
var CompletionItemTag;
(function(CompletionItemTag2) {
  CompletionItemTag2[CompletionItemTag2["Deprecated"] = 1] = "Deprecated";
})(CompletionItemTag || (CompletionItemTag = {}));
var CompletionItem = class CompletionItem2 {
  static {
    __name(this, "CompletionItem");
  }
  constructor(label, kind) {
    this.label = label;
    this.kind = kind;
  }
  toJSON() {
    return {
      label: this.label,
      kind: this.kind && CompletionItemKind[this.kind],
      detail: this.detail,
      documentation: this.documentation,
      sortText: this.sortText,
      filterText: this.filterText,
      preselect: this.preselect,
      insertText: this.insertText,
      textEdit: this.textEdit
    };
  }
};
CompletionItem = __decorate13([
  es5ClassCompat
], CompletionItem);
var CompletionList = class CompletionList2 {
  static {
    __name(this, "CompletionList");
  }
  constructor(items = [], isIncomplete = false) {
    this.items = items;
    this.isIncomplete = isIncomplete;
  }
};
CompletionList = __decorate13([
  es5ClassCompat
], CompletionList);
var InlineSuggestion = class InlineSuggestion2 {
  static {
    __name(this, "InlineSuggestion");
  }
  constructor(insertText, range2, command) {
    this.insertText = insertText;
    this.range = range2;
    this.command = command;
  }
};
InlineSuggestion = __decorate13([
  es5ClassCompat
], InlineSuggestion);
var InlineSuggestionList = class InlineSuggestionList2 {
  static {
    __name(this, "InlineSuggestionList");
  }
  constructor(items) {
    this.commands = void 0;
    this.suppressSuggestions = void 0;
    this.items = items;
  }
};
InlineSuggestionList = __decorate13([
  es5ClassCompat
], InlineSuggestionList);
var PartialAcceptTriggerKind;
(function(PartialAcceptTriggerKind2) {
  PartialAcceptTriggerKind2[PartialAcceptTriggerKind2["Unknown"] = 0] = "Unknown";
  PartialAcceptTriggerKind2[PartialAcceptTriggerKind2["Word"] = 1] = "Word";
  PartialAcceptTriggerKind2[PartialAcceptTriggerKind2["Line"] = 2] = "Line";
  PartialAcceptTriggerKind2[PartialAcceptTriggerKind2["Suggest"] = 3] = "Suggest";
})(PartialAcceptTriggerKind || (PartialAcceptTriggerKind = {}));
var InlineCompletionEndOfLifeReasonKind;
(function(InlineCompletionEndOfLifeReasonKind2) {
  InlineCompletionEndOfLifeReasonKind2[InlineCompletionEndOfLifeReasonKind2["Accepted"] = 0] = "Accepted";
  InlineCompletionEndOfLifeReasonKind2[InlineCompletionEndOfLifeReasonKind2["Rejected"] = 1] = "Rejected";
  InlineCompletionEndOfLifeReasonKind2[InlineCompletionEndOfLifeReasonKind2["Ignored"] = 2] = "Ignored";
})(InlineCompletionEndOfLifeReasonKind || (InlineCompletionEndOfLifeReasonKind = {}));
var InlineCompletionDisplayLocationKind;
(function(InlineCompletionDisplayLocationKind2) {
  InlineCompletionDisplayLocationKind2[InlineCompletionDisplayLocationKind2["Code"] = 1] = "Code";
  InlineCompletionDisplayLocationKind2[InlineCompletionDisplayLocationKind2["Label"] = 2] = "Label";
})(InlineCompletionDisplayLocationKind || (InlineCompletionDisplayLocationKind = {}));
var ViewColumn;
(function(ViewColumn2) {
  ViewColumn2[ViewColumn2["Active"] = -1] = "Active";
  ViewColumn2[ViewColumn2["Beside"] = -2] = "Beside";
  ViewColumn2[ViewColumn2["One"] = 1] = "One";
  ViewColumn2[ViewColumn2["Two"] = 2] = "Two";
  ViewColumn2[ViewColumn2["Three"] = 3] = "Three";
  ViewColumn2[ViewColumn2["Four"] = 4] = "Four";
  ViewColumn2[ViewColumn2["Five"] = 5] = "Five";
  ViewColumn2[ViewColumn2["Six"] = 6] = "Six";
  ViewColumn2[ViewColumn2["Seven"] = 7] = "Seven";
  ViewColumn2[ViewColumn2["Eight"] = 8] = "Eight";
  ViewColumn2[ViewColumn2["Nine"] = 9] = "Nine";
})(ViewColumn || (ViewColumn = {}));
var StatusBarAlignment;
(function(StatusBarAlignment2) {
  StatusBarAlignment2[StatusBarAlignment2["Left"] = 1] = "Left";
  StatusBarAlignment2[StatusBarAlignment2["Right"] = 2] = "Right";
})(StatusBarAlignment || (StatusBarAlignment = {}));
function asStatusBarItemIdentifier(extension, id2) {
  return `${ExtensionIdentifier.toKey(extension)}.${id2}`;
}
__name(asStatusBarItemIdentifier, "asStatusBarItemIdentifier");
var TextEditorLineNumbersStyle;
(function(TextEditorLineNumbersStyle2) {
  TextEditorLineNumbersStyle2[TextEditorLineNumbersStyle2["Off"] = 0] = "Off";
  TextEditorLineNumbersStyle2[TextEditorLineNumbersStyle2["On"] = 1] = "On";
  TextEditorLineNumbersStyle2[TextEditorLineNumbersStyle2["Relative"] = 2] = "Relative";
  TextEditorLineNumbersStyle2[TextEditorLineNumbersStyle2["Interval"] = 3] = "Interval";
})(TextEditorLineNumbersStyle || (TextEditorLineNumbersStyle = {}));
var TextDocumentSaveReason;
(function(TextDocumentSaveReason2) {
  TextDocumentSaveReason2[TextDocumentSaveReason2["Manual"] = 1] = "Manual";
  TextDocumentSaveReason2[TextDocumentSaveReason2["AfterDelay"] = 2] = "AfterDelay";
  TextDocumentSaveReason2[TextDocumentSaveReason2["FocusOut"] = 3] = "FocusOut";
})(TextDocumentSaveReason || (TextDocumentSaveReason = {}));
var TextEditorRevealType;
(function(TextEditorRevealType2) {
  TextEditorRevealType2[TextEditorRevealType2["Default"] = 0] = "Default";
  TextEditorRevealType2[TextEditorRevealType2["InCenter"] = 1] = "InCenter";
  TextEditorRevealType2[TextEditorRevealType2["InCenterIfOutsideViewport"] = 2] = "InCenterIfOutsideViewport";
  TextEditorRevealType2[TextEditorRevealType2["AtTop"] = 3] = "AtTop";
})(TextEditorRevealType || (TextEditorRevealType = {}));
var TextEditorSelectionChangeKind;
(function(TextEditorSelectionChangeKind2) {
  TextEditorSelectionChangeKind2[TextEditorSelectionChangeKind2["Keyboard"] = 1] = "Keyboard";
  TextEditorSelectionChangeKind2[TextEditorSelectionChangeKind2["Mouse"] = 2] = "Mouse";
  TextEditorSelectionChangeKind2[TextEditorSelectionChangeKind2["Command"] = 3] = "Command";
})(TextEditorSelectionChangeKind || (TextEditorSelectionChangeKind = {}));
var TextEditorChangeKind;
(function(TextEditorChangeKind2) {
  TextEditorChangeKind2[TextEditorChangeKind2["Addition"] = 1] = "Addition";
  TextEditorChangeKind2[TextEditorChangeKind2["Deletion"] = 2] = "Deletion";
  TextEditorChangeKind2[TextEditorChangeKind2["Modification"] = 3] = "Modification";
})(TextEditorChangeKind || (TextEditorChangeKind = {}));
var TextDocumentChangeReason;
(function(TextDocumentChangeReason2) {
  TextDocumentChangeReason2[TextDocumentChangeReason2["Undo"] = 1] = "Undo";
  TextDocumentChangeReason2[TextDocumentChangeReason2["Redo"] = 2] = "Redo";
})(TextDocumentChangeReason || (TextDocumentChangeReason = {}));
var DecorationRangeBehavior;
(function(DecorationRangeBehavior2) {
  DecorationRangeBehavior2[DecorationRangeBehavior2["OpenOpen"] = 0] = "OpenOpen";
  DecorationRangeBehavior2[DecorationRangeBehavior2["ClosedClosed"] = 1] = "ClosedClosed";
  DecorationRangeBehavior2[DecorationRangeBehavior2["OpenClosed"] = 2] = "OpenClosed";
  DecorationRangeBehavior2[DecorationRangeBehavior2["ClosedOpen"] = 3] = "ClosedOpen";
})(DecorationRangeBehavior || (DecorationRangeBehavior = {}));
(function(TextEditorSelectionChangeKind2) {
  function fromValue(s) {
    switch (s) {
      case "keyboard":
        return TextEditorSelectionChangeKind2.Keyboard;
      case "mouse":
        return TextEditorSelectionChangeKind2.Mouse;
      case "api":
      case "code.jump":
      case "code.navigation":
        return TextEditorSelectionChangeKind2.Command;
    }
    return void 0;
  }
  __name(fromValue, "fromValue");
  TextEditorSelectionChangeKind2.fromValue = fromValue;
})(TextEditorSelectionChangeKind || (TextEditorSelectionChangeKind = {}));
var SyntaxTokenType;
(function(SyntaxTokenType2) {
  SyntaxTokenType2[SyntaxTokenType2["Other"] = 0] = "Other";
  SyntaxTokenType2[SyntaxTokenType2["Comment"] = 1] = "Comment";
  SyntaxTokenType2[SyntaxTokenType2["String"] = 2] = "String";
  SyntaxTokenType2[SyntaxTokenType2["RegEx"] = 3] = "RegEx";
})(SyntaxTokenType || (SyntaxTokenType = {}));
(function(SyntaxTokenType2) {
  function toString(v) {
    switch (v) {
      case SyntaxTokenType2.Other:
        return "other";
      case SyntaxTokenType2.Comment:
        return "comment";
      case SyntaxTokenType2.String:
        return "string";
      case SyntaxTokenType2.RegEx:
        return "regex";
    }
    return "other";
  }
  __name(toString, "toString");
  SyntaxTokenType2.toString = toString;
})(SyntaxTokenType || (SyntaxTokenType = {}));
var DocumentLink = class DocumentLink2 {
  static {
    __name(this, "DocumentLink");
  }
  constructor(range2, target) {
    if (target && !URI.isUri(target)) {
      throw illegalArgument("target");
    }
    if (!Range.isRange(range2) || range2.isEmpty) {
      throw illegalArgument("range");
    }
    this.range = range2;
    this.target = target;
  }
};
DocumentLink = __decorate13([
  es5ClassCompat
], DocumentLink);
var Color = class Color2 {
  static {
    __name(this, "Color");
  }
  constructor(red, green, blue, alpha) {
    this.red = red;
    this.green = green;
    this.blue = blue;
    this.alpha = alpha;
  }
};
Color = __decorate13([
  es5ClassCompat
], Color);
var ColorInformation = class ColorInformation2 {
  static {
    __name(this, "ColorInformation");
  }
  constructor(range2, color) {
    if (color && !(color instanceof Color)) {
      throw illegalArgument("color");
    }
    if (!Range.isRange(range2) || range2.isEmpty) {
      throw illegalArgument("range");
    }
    this.range = range2;
    this.color = color;
  }
};
ColorInformation = __decorate13([
  es5ClassCompat
], ColorInformation);
var ColorPresentation = class ColorPresentation2 {
  static {
    __name(this, "ColorPresentation");
  }
  constructor(label) {
    if (!label || typeof label !== "string") {
      throw illegalArgument("label");
    }
    this.label = label;
  }
};
ColorPresentation = __decorate13([
  es5ClassCompat
], ColorPresentation);
var ColorFormat;
(function(ColorFormat2) {
  ColorFormat2[ColorFormat2["RGB"] = 0] = "RGB";
  ColorFormat2[ColorFormat2["HEX"] = 1] = "HEX";
  ColorFormat2[ColorFormat2["HSL"] = 2] = "HSL";
})(ColorFormat || (ColorFormat = {}));
var SourceControlInputBoxValidationType;
(function(SourceControlInputBoxValidationType2) {
  SourceControlInputBoxValidationType2[SourceControlInputBoxValidationType2["Error"] = 0] = "Error";
  SourceControlInputBoxValidationType2[SourceControlInputBoxValidationType2["Warning"] = 1] = "Warning";
  SourceControlInputBoxValidationType2[SourceControlInputBoxValidationType2["Information"] = 2] = "Information";
})(SourceControlInputBoxValidationType || (SourceControlInputBoxValidationType = {}));
var TerminalExitReason;
(function(TerminalExitReason2) {
  TerminalExitReason2[TerminalExitReason2["Unknown"] = 0] = "Unknown";
  TerminalExitReason2[TerminalExitReason2["Shutdown"] = 1] = "Shutdown";
  TerminalExitReason2[TerminalExitReason2["Process"] = 2] = "Process";
  TerminalExitReason2[TerminalExitReason2["User"] = 3] = "User";
  TerminalExitReason2[TerminalExitReason2["Extension"] = 4] = "Extension";
})(TerminalExitReason || (TerminalExitReason = {}));
var TerminalShellExecutionCommandLineConfidence;
(function(TerminalShellExecutionCommandLineConfidence2) {
  TerminalShellExecutionCommandLineConfidence2[TerminalShellExecutionCommandLineConfidence2["Low"] = 0] = "Low";
  TerminalShellExecutionCommandLineConfidence2[TerminalShellExecutionCommandLineConfidence2["Medium"] = 1] = "Medium";
  TerminalShellExecutionCommandLineConfidence2[TerminalShellExecutionCommandLineConfidence2["High"] = 2] = "High";
})(TerminalShellExecutionCommandLineConfidence || (TerminalShellExecutionCommandLineConfidence = {}));
var TerminalShellType;
(function(TerminalShellType2) {
  TerminalShellType2[TerminalShellType2["Sh"] = 1] = "Sh";
  TerminalShellType2[TerminalShellType2["Bash"] = 2] = "Bash";
  TerminalShellType2[TerminalShellType2["Fish"] = 3] = "Fish";
  TerminalShellType2[TerminalShellType2["Csh"] = 4] = "Csh";
  TerminalShellType2[TerminalShellType2["Ksh"] = 5] = "Ksh";
  TerminalShellType2[TerminalShellType2["Zsh"] = 6] = "Zsh";
  TerminalShellType2[TerminalShellType2["CommandPrompt"] = 7] = "CommandPrompt";
  TerminalShellType2[TerminalShellType2["GitBash"] = 8] = "GitBash";
  TerminalShellType2[TerminalShellType2["PowerShell"] = 9] = "PowerShell";
  TerminalShellType2[TerminalShellType2["Python"] = 10] = "Python";
  TerminalShellType2[TerminalShellType2["Julia"] = 11] = "Julia";
  TerminalShellType2[TerminalShellType2["NuShell"] = 12] = "NuShell";
  TerminalShellType2[TerminalShellType2["Node"] = 13] = "Node";
  TerminalShellType2[TerminalShellType2["Xonsh"] = 14] = "Xonsh";
})(TerminalShellType || (TerminalShellType = {}));
var TerminalLink = class {
  static {
    __name(this, "TerminalLink");
  }
  constructor(startIndex, length, tooltip) {
    this.startIndex = startIndex;
    this.length = length;
    this.tooltip = tooltip;
    if (typeof startIndex !== "number" || startIndex < 0) {
      throw illegalArgument("startIndex");
    }
    if (typeof length !== "number" || length < 1) {
      throw illegalArgument("length");
    }
    if (tooltip !== void 0 && typeof tooltip !== "string") {
      throw illegalArgument("tooltip");
    }
  }
};
var TerminalQuickFixOpener = class {
  static {
    __name(this, "TerminalQuickFixOpener");
  }
  constructor(uri) {
    this.uri = uri;
  }
};
var TerminalQuickFixCommand = class {
  static {
    __name(this, "TerminalQuickFixCommand");
  }
  constructor(terminalCommand) {
    this.terminalCommand = terminalCommand;
  }
};
var TerminalLocation;
(function(TerminalLocation2) {
  TerminalLocation2[TerminalLocation2["Panel"] = 1] = "Panel";
  TerminalLocation2[TerminalLocation2["Editor"] = 2] = "Editor";
})(TerminalLocation || (TerminalLocation = {}));
var TerminalProfile = class {
  static {
    __name(this, "TerminalProfile");
  }
  constructor(options) {
    this.options = options;
    if (typeof options !== "object") {
      throw illegalArgument("options");
    }
  }
};
var TerminalCompletionItemKind;
(function(TerminalCompletionItemKind2) {
  TerminalCompletionItemKind2[TerminalCompletionItemKind2["File"] = 0] = "File";
  TerminalCompletionItemKind2[TerminalCompletionItemKind2["Folder"] = 1] = "Folder";
  TerminalCompletionItemKind2[TerminalCompletionItemKind2["Method"] = 2] = "Method";
  TerminalCompletionItemKind2[TerminalCompletionItemKind2["Alias"] = 3] = "Alias";
  TerminalCompletionItemKind2[TerminalCompletionItemKind2["Argument"] = 4] = "Argument";
  TerminalCompletionItemKind2[TerminalCompletionItemKind2["Option"] = 5] = "Option";
  TerminalCompletionItemKind2[TerminalCompletionItemKind2["OptionValue"] = 6] = "OptionValue";
  TerminalCompletionItemKind2[TerminalCompletionItemKind2["Flag"] = 7] = "Flag";
  TerminalCompletionItemKind2[TerminalCompletionItemKind2["SymbolicLinkFile"] = 8] = "SymbolicLinkFile";
  TerminalCompletionItemKind2[TerminalCompletionItemKind2["SymbolicLinkFolder"] = 9] = "SymbolicLinkFolder";
  TerminalCompletionItemKind2[TerminalCompletionItemKind2["ScmCommit"] = 10] = "ScmCommit";
  TerminalCompletionItemKind2[TerminalCompletionItemKind2["ScmBranch"] = 11] = "ScmBranch";
  TerminalCompletionItemKind2[TerminalCompletionItemKind2["ScmTag"] = 12] = "ScmTag";
  TerminalCompletionItemKind2[TerminalCompletionItemKind2["ScmStash"] = 13] = "ScmStash";
  TerminalCompletionItemKind2[TerminalCompletionItemKind2["ScmRemote"] = 14] = "ScmRemote";
  TerminalCompletionItemKind2[TerminalCompletionItemKind2["PullRequest"] = 15] = "PullRequest";
  TerminalCompletionItemKind2[TerminalCompletionItemKind2["PullRequestDone"] = 16] = "PullRequestDone";
})(TerminalCompletionItemKind || (TerminalCompletionItemKind = {}));
var TerminalCompletionItem = class {
  static {
    __name(this, "TerminalCompletionItem");
  }
  constructor(label, replacementRange, kind, detail, documentation, isFile, isDirectory, isKeyword) {
    this.label = label;
    this.replacementRange = replacementRange;
    this.kind = kind;
    this.detail = detail;
    this.documentation = documentation;
    this.isFile = isFile;
    this.isDirectory = isDirectory;
    this.isKeyword = isKeyword;
  }
};
var TerminalCompletionList = class {
  static {
    __name(this, "TerminalCompletionList");
  }
  /**
   * Creates a new completion list.
   *
   * @param items The completion items.
   * @param isIncomplete The list is not complete.
   */
  constructor(items, resourceOptions) {
    this.items = items ?? [];
    this.resourceOptions = resourceOptions;
  }
};
var TaskRevealKind;
(function(TaskRevealKind2) {
  TaskRevealKind2[TaskRevealKind2["Always"] = 1] = "Always";
  TaskRevealKind2[TaskRevealKind2["Silent"] = 2] = "Silent";
  TaskRevealKind2[TaskRevealKind2["Never"] = 3] = "Never";
})(TaskRevealKind || (TaskRevealKind = {}));
var TaskEventKind;
(function(TaskEventKind2) {
  TaskEventKind2["Changed"] = "changed";
  TaskEventKind2["ProcessStarted"] = "processStarted";
  TaskEventKind2["ProcessEnded"] = "processEnded";
  TaskEventKind2["Terminated"] = "terminated";
  TaskEventKind2["Start"] = "start";
  TaskEventKind2["AcquiredInput"] = "acquiredInput";
  TaskEventKind2["DependsOnStarted"] = "dependsOnStarted";
  TaskEventKind2["Active"] = "active";
  TaskEventKind2["Inactive"] = "inactive";
  TaskEventKind2["End"] = "end";
  TaskEventKind2["ProblemMatcherStarted"] = "problemMatcherStarted";
  TaskEventKind2["ProblemMatcherEnded"] = "problemMatcherEnded";
  TaskEventKind2["ProblemMatcherFoundErrors"] = "problemMatcherFoundErrors";
})(TaskEventKind || (TaskEventKind = {}));
var TaskPanelKind;
(function(TaskPanelKind2) {
  TaskPanelKind2[TaskPanelKind2["Shared"] = 1] = "Shared";
  TaskPanelKind2[TaskPanelKind2["Dedicated"] = 2] = "Dedicated";
  TaskPanelKind2[TaskPanelKind2["New"] = 3] = "New";
})(TaskPanelKind || (TaskPanelKind = {}));
var TaskGroup = class TaskGroup2 {
  static {
    __name(this, "TaskGroup");
  }
  static {
    TaskGroup_1 = this;
  }
  static {
    this.Clean = new TaskGroup_1("clean", "Clean");
  }
  static {
    this.Build = new TaskGroup_1("build", "Build");
  }
  static {
    this.Rebuild = new TaskGroup_1("rebuild", "Rebuild");
  }
  static {
    this.Test = new TaskGroup_1("test", "Test");
  }
  static from(value) {
    switch (value) {
      case "clean":
        return TaskGroup_1.Clean;
      case "build":
        return TaskGroup_1.Build;
      case "rebuild":
        return TaskGroup_1.Rebuild;
      case "test":
        return TaskGroup_1.Test;
      default:
        return void 0;
    }
  }
  constructor(id2, label) {
    this.label = label;
    if (typeof id2 !== "string") {
      throw illegalArgument("name");
    }
    if (typeof label !== "string") {
      throw illegalArgument("name");
    }
    this._id = id2;
  }
  get id() {
    return this._id;
  }
};
TaskGroup = TaskGroup_1 = __decorate13([
  es5ClassCompat
], TaskGroup);
function computeTaskExecutionId(values) {
  let id2 = "";
  for (let i = 0; i < values.length; i++) {
    id2 += values[i].replace(/,/g, ",,") + ",";
  }
  return id2;
}
__name(computeTaskExecutionId, "computeTaskExecutionId");
var ProcessExecution = class ProcessExecution2 {
  static {
    __name(this, "ProcessExecution");
  }
  constructor(process2, varg1, varg2) {
    if (typeof process2 !== "string") {
      throw illegalArgument("process");
    }
    this._args = [];
    this._process = process2;
    if (varg1 !== void 0) {
      if (Array.isArray(varg1)) {
        this._args = varg1;
        this._options = varg2;
      } else {
        this._options = varg1;
      }
    }
  }
  get process() {
    return this._process;
  }
  set process(value) {
    if (typeof value !== "string") {
      throw illegalArgument("process");
    }
    this._process = value;
  }
  get args() {
    return this._args;
  }
  set args(value) {
    if (!Array.isArray(value)) {
      value = [];
    }
    this._args = value;
  }
  get options() {
    return this._options;
  }
  set options(value) {
    this._options = value;
  }
  computeId() {
    const props = [];
    props.push("process");
    if (this._process !== void 0) {
      props.push(this._process);
    }
    if (this._args && this._args.length > 0) {
      for (const arg of this._args) {
        props.push(arg);
      }
    }
    return computeTaskExecutionId(props);
  }
};
ProcessExecution = __decorate13([
  es5ClassCompat
], ProcessExecution);
var ShellExecution = class ShellExecution2 {
  static {
    __name(this, "ShellExecution");
  }
  constructor(arg0, arg1, arg2) {
    this._args = [];
    if (Array.isArray(arg1)) {
      if (!arg0) {
        throw illegalArgument("command can't be undefined or null");
      }
      if (typeof arg0 !== "string" && typeof arg0.value !== "string") {
        throw illegalArgument("command");
      }
      this._command = arg0;
      if (arg1) {
        this._args = arg1;
      }
      this._options = arg2;
    } else {
      if (typeof arg0 !== "string") {
        throw illegalArgument("commandLine");
      }
      this._commandLine = arg0;
      this._options = arg1;
    }
  }
  get commandLine() {
    return this._commandLine;
  }
  set commandLine(value) {
    if (typeof value !== "string") {
      throw illegalArgument("commandLine");
    }
    this._commandLine = value;
  }
  get command() {
    return this._command ? this._command : "";
  }
  set command(value) {
    if (typeof value !== "string" && typeof value.value !== "string") {
      throw illegalArgument("command");
    }
    this._command = value;
  }
  get args() {
    return this._args;
  }
  set args(value) {
    this._args = value || [];
  }
  get options() {
    return this._options;
  }
  set options(value) {
    this._options = value;
  }
  computeId() {
    const props = [];
    props.push("shell");
    if (this._commandLine !== void 0) {
      props.push(this._commandLine);
    }
    if (this._command !== void 0) {
      props.push(typeof this._command === "string" ? this._command : this._command.value);
    }
    if (this._args && this._args.length > 0) {
      for (const arg of this._args) {
        props.push(typeof arg === "string" ? arg : arg.value);
      }
    }
    return computeTaskExecutionId(props);
  }
};
ShellExecution = __decorate13([
  es5ClassCompat
], ShellExecution);
var ShellQuoting;
(function(ShellQuoting2) {
  ShellQuoting2[ShellQuoting2["Escape"] = 1] = "Escape";
  ShellQuoting2[ShellQuoting2["Strong"] = 2] = "Strong";
  ShellQuoting2[ShellQuoting2["Weak"] = 3] = "Weak";
})(ShellQuoting || (ShellQuoting = {}));
var TaskScope;
(function(TaskScope2) {
  TaskScope2[TaskScope2["Global"] = 1] = "Global";
  TaskScope2[TaskScope2["Workspace"] = 2] = "Workspace";
})(TaskScope || (TaskScope = {}));
var TaskRunOn;
(function(TaskRunOn2) {
  TaskRunOn2[TaskRunOn2["Default"] = 1] = "Default";
  TaskRunOn2[TaskRunOn2["FolderOpen"] = 2] = "FolderOpen";
  TaskRunOn2[TaskRunOn2["WorktreeCreated"] = 3] = "WorktreeCreated";
})(TaskRunOn || (TaskRunOn = {}));
var CustomExecution = class {
  static {
    __name(this, "CustomExecution");
  }
  constructor(callback) {
    this._callback = callback;
  }
  computeId() {
    return "customExecution" + generateUuid();
  }
  set callback(value) {
    this._callback = value;
  }
  get callback() {
    return this._callback;
  }
};
var Task = class Task2 {
  static {
    __name(this, "Task");
  }
  static {
    Task_1 = this;
  }
  static {
    this.ExtensionCallbackType = "customExecution";
  }
  static {
    this.ProcessType = "process";
  }
  static {
    this.ShellType = "shell";
  }
  static {
    this.EmptyType = "$empty";
  }
  constructor(definition, arg2, arg3, arg4, arg5, arg6) {
    this.__deprecated = false;
    this._definition = this.definition = definition;
    let problemMatchers;
    if (typeof arg2 === "string") {
      this._name = this.name = arg2;
      this._source = this.source = arg3;
      this.execution = arg4;
      problemMatchers = arg5;
      this.__deprecated = true;
    } else if (arg2 === TaskScope.Global || arg2 === TaskScope.Workspace) {
      this.target = arg2;
      this._name = this.name = arg3;
      this._source = this.source = arg4;
      this.execution = arg5;
      problemMatchers = arg6;
    } else {
      this.target = arg2;
      this._name = this.name = arg3;
      this._source = this.source = arg4;
      this.execution = arg5;
      problemMatchers = arg6;
    }
    if (typeof problemMatchers === "string") {
      this._problemMatchers = [problemMatchers];
      this._hasDefinedMatchers = true;
    } else if (Array.isArray(problemMatchers)) {
      this._problemMatchers = problemMatchers;
      this._hasDefinedMatchers = true;
    } else {
      this._problemMatchers = [];
      this._hasDefinedMatchers = false;
    }
    this._isBackground = false;
    this._presentationOptions = /* @__PURE__ */ Object.create(null);
    this._runOptions = /* @__PURE__ */ Object.create(null);
  }
  get _id() {
    return this.__id;
  }
  set _id(value) {
    this.__id = value;
  }
  get _deprecated() {
    return this.__deprecated;
  }
  clear() {
    if (this.__id === void 0) {
      return;
    }
    this.__id = void 0;
    this._scope = void 0;
    this.computeDefinitionBasedOnExecution();
  }
  computeDefinitionBasedOnExecution() {
    if (this._execution instanceof ProcessExecution) {
      this._definition = {
        type: Task_1.ProcessType,
        id: this._execution.computeId()
      };
    } else if (this._execution instanceof ShellExecution) {
      this._definition = {
        type: Task_1.ShellType,
        id: this._execution.computeId()
      };
    } else if (this._execution instanceof CustomExecution) {
      this._definition = {
        type: Task_1.ExtensionCallbackType,
        id: this._execution.computeId()
      };
    } else {
      this._definition = {
        type: Task_1.EmptyType,
        id: generateUuid()
      };
    }
  }
  get definition() {
    return this._definition;
  }
  set definition(value) {
    if (value === void 0 || value === null) {
      throw illegalArgument("Kind can't be undefined or null");
    }
    this.clear();
    this._definition = value;
  }
  get scope() {
    return this._scope;
  }
  set target(value) {
    this.clear();
    this._scope = value;
  }
  get name() {
    return this._name;
  }
  set name(value) {
    if (typeof value !== "string") {
      throw illegalArgument("name");
    }
    this.clear();
    this._name = value;
  }
  get execution() {
    return this._execution;
  }
  set execution(value) {
    if (value === null) {
      value = void 0;
    }
    this.clear();
    this._execution = value;
    const type = this._definition.type;
    if (Task_1.EmptyType === type || Task_1.ProcessType === type || Task_1.ShellType === type || Task_1.ExtensionCallbackType === type) {
      this.computeDefinitionBasedOnExecution();
    }
  }
  get problemMatchers() {
    return this._problemMatchers;
  }
  set problemMatchers(value) {
    if (!Array.isArray(value)) {
      this.clear();
      this._problemMatchers = [];
      this._hasDefinedMatchers = false;
      return;
    } else {
      this.clear();
      this._problemMatchers = value;
      this._hasDefinedMatchers = true;
    }
  }
  get hasDefinedMatchers() {
    return this._hasDefinedMatchers;
  }
  get isBackground() {
    return this._isBackground;
  }
  set isBackground(value) {
    if (value !== true && value !== false) {
      value = false;
    }
    this.clear();
    this._isBackground = value;
  }
  get source() {
    return this._source;
  }
  set source(value) {
    if (typeof value !== "string" || value.length === 0) {
      throw illegalArgument("source must be a string of length > 0");
    }
    this.clear();
    this._source = value;
  }
  get group() {
    return this._group;
  }
  set group(value) {
    if (value === null) {
      value = void 0;
    }
    this.clear();
    this._group = value;
  }
  get detail() {
    return this._detail;
  }
  set detail(value) {
    if (value === null) {
      value = void 0;
    }
    this._detail = value;
  }
  get presentationOptions() {
    return this._presentationOptions;
  }
  set presentationOptions(value) {
    if (value === null || value === void 0) {
      value = /* @__PURE__ */ Object.create(null);
    }
    this.clear();
    this._presentationOptions = value;
  }
  get runOptions() {
    return this._runOptions;
  }
  set runOptions(value) {
    if (value === null || value === void 0) {
      value = /* @__PURE__ */ Object.create(null);
    }
    this.clear();
    this._runOptions = value;
  }
};
Task = Task_1 = __decorate13([
  es5ClassCompat
], Task);
var ProgressLocation;
(function(ProgressLocation2) {
  ProgressLocation2[ProgressLocation2["SourceControl"] = 1] = "SourceControl";
  ProgressLocation2[ProgressLocation2["Window"] = 10] = "Window";
  ProgressLocation2[ProgressLocation2["Notification"] = 15] = "Notification";
})(ProgressLocation || (ProgressLocation = {}));
var ViewBadge;
(function(ViewBadge2) {
  function isViewBadge(thing) {
    const viewBadgeThing = thing;
    if (!isNumber(viewBadgeThing.value)) {
      console.log("INVALID view badge, invalid value", viewBadgeThing.value);
      return false;
    }
    if (viewBadgeThing.tooltip && !isString(viewBadgeThing.tooltip)) {
      console.log("INVALID view badge, invalid tooltip", viewBadgeThing.tooltip);
      return false;
    }
    return true;
  }
  __name(isViewBadge, "isViewBadge");
  ViewBadge2.isViewBadge = isViewBadge;
})(ViewBadge || (ViewBadge = {}));
var TreeItem = TreeItem_1 = class TreeItem2 {
  static {
    __name(this, "TreeItem");
  }
  static isTreeItem(thing, extension) {
    const treeItemThing = thing;
    if (treeItemThing.checkboxState !== void 0) {
      const checkbox = isNumber(treeItemThing.checkboxState) ? treeItemThing.checkboxState : isObject(treeItemThing.checkboxState) && isNumber(treeItemThing.checkboxState.state) ? treeItemThing.checkboxState.state : void 0;
      const tooltip = !isNumber(treeItemThing.checkboxState) && isObject(treeItemThing.checkboxState) ? treeItemThing.checkboxState.tooltip : void 0;
      if (checkbox === void 0 || checkbox !== TreeItemCheckboxState.Checked && checkbox !== TreeItemCheckboxState.Unchecked || tooltip !== void 0 && !isString(tooltip)) {
        console.log("INVALID tree item, invalid checkboxState", treeItemThing.checkboxState);
        return false;
      }
    }
    if (thing instanceof TreeItem_1) {
      return true;
    }
    if (treeItemThing.label !== void 0 && !isString(treeItemThing.label) && !treeItemThing.label?.label) {
      console.log("INVALID tree item, invalid label", treeItemThing.label);
      return false;
    }
    if (treeItemThing.id !== void 0 && !isString(treeItemThing.id)) {
      console.log("INVALID tree item, invalid id", treeItemThing.id);
      return false;
    }
    if (treeItemThing.iconPath !== void 0 && !isString(treeItemThing.iconPath) && !URI.isUri(treeItemThing.iconPath) && (!treeItemThing.iconPath || !isString(treeItemThing.iconPath.id))) {
      const asLightAndDarkThing = treeItemThing.iconPath;
      if (!asLightAndDarkThing || !isString(asLightAndDarkThing.light) && !URI.isUri(asLightAndDarkThing.light) && !isString(asLightAndDarkThing.dark) && !URI.isUri(asLightAndDarkThing.dark)) {
        console.log("INVALID tree item, invalid iconPath", treeItemThing.iconPath);
        return false;
      }
    }
    if (treeItemThing.description !== void 0 && !isString(treeItemThing.description) && typeof treeItemThing.description !== "boolean") {
      console.log("INVALID tree item, invalid description", treeItemThing.description);
      return false;
    }
    if (treeItemThing.resourceUri !== void 0 && !URI.isUri(treeItemThing.resourceUri)) {
      console.log("INVALID tree item, invalid resourceUri", treeItemThing.resourceUri);
      return false;
    }
    if (treeItemThing.tooltip !== void 0 && !isString(treeItemThing.tooltip) && !(treeItemThing.tooltip instanceof MarkdownString2)) {
      console.log("INVALID tree item, invalid tooltip", treeItemThing.tooltip);
      return false;
    }
    if (treeItemThing.command !== void 0 && !treeItemThing.command.command) {
      console.log("INVALID tree item, invalid command", treeItemThing.command);
      return false;
    }
    if (treeItemThing.collapsibleState !== void 0 && treeItemThing.collapsibleState < TreeItemCollapsibleState.None && treeItemThing.collapsibleState > TreeItemCollapsibleState.Expanded) {
      console.log("INVALID tree item, invalid collapsibleState", treeItemThing.collapsibleState);
      return false;
    }
    if (treeItemThing.contextValue !== void 0 && !isString(treeItemThing.contextValue)) {
      console.log("INVALID tree item, invalid contextValue", treeItemThing.contextValue);
      return false;
    }
    if (treeItemThing.accessibilityInformation !== void 0 && !treeItemThing.accessibilityInformation?.label) {
      console.log("INVALID tree item, invalid accessibilityInformation", treeItemThing.accessibilityInformation);
      return false;
    }
    return true;
  }
  constructor(arg1, collapsibleState = TreeItemCollapsibleState.None) {
    this.collapsibleState = collapsibleState;
    if (URI.isUri(arg1)) {
      this.resourceUri = arg1;
    } else {
      this.label = arg1;
    }
  }
};
TreeItem = TreeItem_1 = __decorate13([
  es5ClassCompat
], TreeItem);
var TreeItemCollapsibleState;
(function(TreeItemCollapsibleState2) {
  TreeItemCollapsibleState2[TreeItemCollapsibleState2["None"] = 0] = "None";
  TreeItemCollapsibleState2[TreeItemCollapsibleState2["Collapsed"] = 1] = "Collapsed";
  TreeItemCollapsibleState2[TreeItemCollapsibleState2["Expanded"] = 2] = "Expanded";
})(TreeItemCollapsibleState || (TreeItemCollapsibleState = {}));
var TreeItemCheckboxState;
(function(TreeItemCheckboxState2) {
  TreeItemCheckboxState2[TreeItemCheckboxState2["Unchecked"] = 0] = "Unchecked";
  TreeItemCheckboxState2[TreeItemCheckboxState2["Checked"] = 1] = "Checked";
})(TreeItemCheckboxState || (TreeItemCheckboxState = {}));
var DataTransferItem = class DataTransferItem2 {
  static {
    __name(this, "DataTransferItem");
  }
  async asString() {
    return typeof this.value === "string" ? this.value : JSON.stringify(this.value);
  }
  asFile() {
    return void 0;
  }
  constructor(value) {
    this.value = value;
  }
};
DataTransferItem = __decorate13([
  es5ClassCompat
], DataTransferItem);
var InternalDataTransferItem = class extends DataTransferItem {
  static {
    __name(this, "InternalDataTransferItem");
  }
};
var InternalFileDataTransferItem = class extends InternalDataTransferItem {
  static {
    __name(this, "InternalFileDataTransferItem");
  }
  #file;
  constructor(file) {
    super("");
    this.#file = file;
  }
  asFile() {
    return this.#file;
  }
};
var DataTransferFile = class {
  static {
    __name(this, "DataTransferFile");
  }
  constructor(name, uri, itemId, getData) {
    this.name = name;
    this.uri = uri;
    this._itemId = itemId;
    this._getData = getData;
  }
  data() {
    return this._getData();
  }
};
var DataTransfer = class DataTransfer2 {
  static {
    __name(this, "DataTransfer");
  }
  #items = /* @__PURE__ */ new Map();
  constructor(init) {
    for (const [mime, item] of init ?? []) {
      const existing = this.#items.get(this.#normalizeMime(mime));
      if (existing) {
        existing.push(item);
      } else {
        this.#items.set(this.#normalizeMime(mime), [item]);
      }
    }
  }
  get(mimeType) {
    return this.#items.get(this.#normalizeMime(mimeType))?.[0];
  }
  set(mimeType, value) {
    this.#items.set(this.#normalizeMime(mimeType), [value]);
  }
  forEach(callbackfn, thisArg) {
    for (const [mime, items] of this.#items) {
      for (const item of items) {
        callbackfn.call(thisArg, item, mime, this);
      }
    }
  }
  *[Symbol.iterator]() {
    for (const [mime, items] of this.#items) {
      for (const item of items) {
        yield [mime, item];
      }
    }
  }
  #normalizeMime(mimeType) {
    return mimeType.toLowerCase();
  }
};
DataTransfer = __decorate13([
  es5ClassCompat
], DataTransfer);
var DocumentDropEdit = class DocumentDropEdit2 {
  static {
    __name(this, "DocumentDropEdit");
  }
  constructor(insertText, title, kind) {
    this.insertText = insertText;
    this.title = title;
    this.kind = kind;
  }
};
DocumentDropEdit = __decorate13([
  es5ClassCompat
], DocumentDropEdit);
var DocumentPasteTriggerKind;
(function(DocumentPasteTriggerKind2) {
  DocumentPasteTriggerKind2[DocumentPasteTriggerKind2["Automatic"] = 0] = "Automatic";
  DocumentPasteTriggerKind2[DocumentPasteTriggerKind2["PasteAs"] = 1] = "PasteAs";
})(DocumentPasteTriggerKind || (DocumentPasteTriggerKind = {}));
var DocumentDropOrPasteEditKind = class _DocumentDropOrPasteEditKind {
  static {
    __name(this, "DocumentDropOrPasteEditKind");
  }
  static {
    this.sep = ".";
  }
  constructor(value) {
    this.value = value;
  }
  append(...parts) {
    return new _DocumentDropOrPasteEditKind((this.value ? [this.value, ...parts] : parts).join(_DocumentDropOrPasteEditKind.sep));
  }
  intersects(other) {
    return this.contains(other) || other.contains(this);
  }
  contains(other) {
    return this.value === other.value || other.value.startsWith(this.value + _DocumentDropOrPasteEditKind.sep);
  }
};
DocumentDropOrPasteEditKind.Empty = new DocumentDropOrPasteEditKind("");
DocumentDropOrPasteEditKind.Text = new DocumentDropOrPasteEditKind("text");
DocumentDropOrPasteEditKind.TextUpdateImports = DocumentDropOrPasteEditKind.Text.append("updateImports");
var DocumentPasteEdit = class {
  static {
    __name(this, "DocumentPasteEdit");
  }
  constructor(insertText, title, kind) {
    this.title = title;
    this.insertText = insertText;
    this.kind = kind;
  }
};
var ThemeIcon2 = class ThemeIcon3 {
  static {
    __name(this, "ThemeIcon");
  }
  constructor(id2, color) {
    this.id = id2;
    this.color = color;
  }
  static isThemeIcon(thing) {
    if (typeof thing.id !== "string") {
      console.log("INVALID ThemeIcon, invalid id", thing.id);
      return false;
    }
    return true;
  }
};
ThemeIcon2 = __decorate13([
  es5ClassCompat
], ThemeIcon2);
ThemeIcon2.File = new ThemeIcon2("file");
ThemeIcon2.Folder = new ThemeIcon2("folder");
var ThemeColor2 = class ThemeColor3 {
  static {
    __name(this, "ThemeColor");
  }
  constructor(id2) {
    this.id = id2;
  }
};
ThemeColor2 = __decorate13([
  es5ClassCompat
], ThemeColor2);
var ConfigurationTarget;
(function(ConfigurationTarget2) {
  ConfigurationTarget2[ConfigurationTarget2["Global"] = 1] = "Global";
  ConfigurationTarget2[ConfigurationTarget2["Workspace"] = 2] = "Workspace";
  ConfigurationTarget2[ConfigurationTarget2["WorkspaceFolder"] = 3] = "WorkspaceFolder";
})(ConfigurationTarget || (ConfigurationTarget = {}));
var RelativePattern = class RelativePattern2 {
  static {
    __name(this, "RelativePattern");
  }
  get base() {
    return this._base;
  }
  set base(base) {
    this._base = base;
    this._baseUri = URI.file(base);
  }
  get baseUri() {
    return this._baseUri;
  }
  set baseUri(baseUri) {
    this._baseUri = baseUri;
    this._base = baseUri.fsPath;
  }
  constructor(base, pattern) {
    if (typeof base !== "string") {
      if (!base || !URI.isUri(base) && !URI.isUri(base.uri)) {
        throw illegalArgument("base");
      }
    }
    if (typeof pattern !== "string") {
      throw illegalArgument("pattern");
    }
    if (typeof base === "string") {
      this.baseUri = URI.file(base);
    } else if (URI.isUri(base)) {
      this.baseUri = base;
    } else {
      this.baseUri = base.uri;
    }
    this.pattern = pattern;
  }
  toJSON() {
    return {
      pattern: this.pattern,
      base: this.base,
      baseUri: this.baseUri.toJSON()
    };
  }
};
RelativePattern = __decorate13([
  es5ClassCompat
], RelativePattern);
var breakpointIds = /* @__PURE__ */ new WeakMap();
function setBreakpointId(bp, id2) {
  breakpointIds.set(bp, id2);
}
__name(setBreakpointId, "setBreakpointId");
var Breakpoint = class Breakpoint2 {
  static {
    __name(this, "Breakpoint");
  }
  constructor(enabled, condition, hitCondition, logMessage, mode) {
    this.enabled = typeof enabled === "boolean" ? enabled : true;
    if (typeof condition === "string") {
      this.condition = condition;
    }
    if (typeof hitCondition === "string") {
      this.hitCondition = hitCondition;
    }
    if (typeof logMessage === "string") {
      this.logMessage = logMessage;
    }
    if (typeof mode === "string") {
      this.mode = mode;
    }
  }
  get id() {
    if (!this._id) {
      this._id = breakpointIds.get(this) ?? generateUuid();
    }
    return this._id;
  }
};
Breakpoint = __decorate13([
  es5ClassCompat
], Breakpoint);
var SourceBreakpoint = class SourceBreakpoint2 extends Breakpoint {
  static {
    __name(this, "SourceBreakpoint");
  }
  constructor(location, enabled, condition, hitCondition, logMessage, mode) {
    super(enabled, condition, hitCondition, logMessage, mode);
    if (location === null) {
      throw illegalArgument("location");
    }
    this.location = location;
  }
};
SourceBreakpoint = __decorate13([
  es5ClassCompat
], SourceBreakpoint);
var FunctionBreakpoint = class FunctionBreakpoint2 extends Breakpoint {
  static {
    __name(this, "FunctionBreakpoint");
  }
  constructor(functionName, enabled, condition, hitCondition, logMessage, mode) {
    super(enabled, condition, hitCondition, logMessage, mode);
    this.functionName = functionName;
  }
};
FunctionBreakpoint = __decorate13([
  es5ClassCompat
], FunctionBreakpoint);
var DataBreakpoint = class DataBreakpoint2 extends Breakpoint {
  static {
    __name(this, "DataBreakpoint");
  }
  constructor(label, dataId, canPersist, enabled, condition, hitCondition, logMessage, mode) {
    super(enabled, condition, hitCondition, logMessage, mode);
    if (!dataId) {
      throw illegalArgument("dataId");
    }
    this.label = label;
    this.dataId = dataId;
    this.canPersist = canPersist;
  }
};
DataBreakpoint = __decorate13([
  es5ClassCompat
], DataBreakpoint);
var DebugAdapterExecutable = class DebugAdapterExecutable2 {
  static {
    __name(this, "DebugAdapterExecutable");
  }
  constructor(command, args, options) {
    this.command = command;
    this.args = args || [];
    this.options = options;
  }
};
DebugAdapterExecutable = __decorate13([
  es5ClassCompat
], DebugAdapterExecutable);
var DebugAdapterServer = class DebugAdapterServer2 {
  static {
    __name(this, "DebugAdapterServer");
  }
  constructor(port, host) {
    this.port = port;
    this.host = host;
  }
};
DebugAdapterServer = __decorate13([
  es5ClassCompat
], DebugAdapterServer);
var DebugAdapterNamedPipeServer = class DebugAdapterNamedPipeServer2 {
  static {
    __name(this, "DebugAdapterNamedPipeServer");
  }
  constructor(path) {
    this.path = path;
  }
};
DebugAdapterNamedPipeServer = __decorate13([
  es5ClassCompat
], DebugAdapterNamedPipeServer);
var DebugAdapterInlineImplementation = class DebugAdapterInlineImplementation2 {
  static {
    __name(this, "DebugAdapterInlineImplementation");
  }
  constructor(impl) {
    this.implementation = impl;
  }
};
DebugAdapterInlineImplementation = __decorate13([
  es5ClassCompat
], DebugAdapterInlineImplementation);
var DebugStackFrame = class {
  static {
    __name(this, "DebugStackFrame");
  }
  constructor(session, threadId, frameId) {
    this.session = session;
    this.threadId = threadId;
    this.frameId = frameId;
  }
};
var DebugThread = class {
  static {
    __name(this, "DebugThread");
  }
  constructor(session, threadId) {
    this.session = session;
    this.threadId = threadId;
  }
};
var EvaluatableExpression = class EvaluatableExpression2 {
  static {
    __name(this, "EvaluatableExpression");
  }
  constructor(range2, expression) {
    this.range = range2;
    this.expression = expression;
  }
};
EvaluatableExpression = __decorate13([
  es5ClassCompat
], EvaluatableExpression);
var InlineCompletionTriggerKind;
(function(InlineCompletionTriggerKind2) {
  InlineCompletionTriggerKind2[InlineCompletionTriggerKind2["Invoke"] = 0] = "Invoke";
  InlineCompletionTriggerKind2[InlineCompletionTriggerKind2["Automatic"] = 1] = "Automatic";
})(InlineCompletionTriggerKind || (InlineCompletionTriggerKind = {}));
var InlineCompletionsDisposeReasonKind;
(function(InlineCompletionsDisposeReasonKind2) {
  InlineCompletionsDisposeReasonKind2[InlineCompletionsDisposeReasonKind2["Other"] = 0] = "Other";
  InlineCompletionsDisposeReasonKind2[InlineCompletionsDisposeReasonKind2["Empty"] = 1] = "Empty";
  InlineCompletionsDisposeReasonKind2[InlineCompletionsDisposeReasonKind2["TokenCancellation"] = 2] = "TokenCancellation";
  InlineCompletionsDisposeReasonKind2[InlineCompletionsDisposeReasonKind2["LostRace"] = 3] = "LostRace";
  InlineCompletionsDisposeReasonKind2[InlineCompletionsDisposeReasonKind2["NotTaken"] = 4] = "NotTaken";
})(InlineCompletionsDisposeReasonKind || (InlineCompletionsDisposeReasonKind = {}));
var InlineValueText = class InlineValueText2 {
  static {
    __name(this, "InlineValueText");
  }
  constructor(range2, text) {
    this.range = range2;
    this.text = text;
  }
};
InlineValueText = __decorate13([
  es5ClassCompat
], InlineValueText);
var InlineValueVariableLookup = class InlineValueVariableLookup2 {
  static {
    __name(this, "InlineValueVariableLookup");
  }
  constructor(range2, variableName, caseSensitiveLookup = true) {
    this.range = range2;
    this.variableName = variableName;
    this.caseSensitiveLookup = caseSensitiveLookup;
  }
};
InlineValueVariableLookup = __decorate13([
  es5ClassCompat
], InlineValueVariableLookup);
var InlineValueEvaluatableExpression = class InlineValueEvaluatableExpression2 {
  static {
    __name(this, "InlineValueEvaluatableExpression");
  }
  constructor(range2, expression) {
    this.range = range2;
    this.expression = expression;
  }
};
InlineValueEvaluatableExpression = __decorate13([
  es5ClassCompat
], InlineValueEvaluatableExpression);
var InlineValueContext = class InlineValueContext2 {
  static {
    __name(this, "InlineValueContext");
  }
  constructor(frameId, range2) {
    this.frameId = frameId;
    this.stoppedLocation = range2;
  }
};
InlineValueContext = __decorate13([
  es5ClassCompat
], InlineValueContext);
var NewSymbolNameTag;
(function(NewSymbolNameTag2) {
  NewSymbolNameTag2[NewSymbolNameTag2["AIGenerated"] = 1] = "AIGenerated";
})(NewSymbolNameTag || (NewSymbolNameTag = {}));
var NewSymbolNameTriggerKind;
(function(NewSymbolNameTriggerKind2) {
  NewSymbolNameTriggerKind2[NewSymbolNameTriggerKind2["Invoke"] = 0] = "Invoke";
  NewSymbolNameTriggerKind2[NewSymbolNameTriggerKind2["Automatic"] = 1] = "Automatic";
})(NewSymbolNameTriggerKind || (NewSymbolNameTriggerKind = {}));
var NewSymbolName = class {
  static {
    __name(this, "NewSymbolName");
  }
  constructor(newSymbolName, tags) {
    this.newSymbolName = newSymbolName;
    this.tags = tags;
  }
};
var FileChangeType2;
(function(FileChangeType3) {
  FileChangeType3[FileChangeType3["Changed"] = 1] = "Changed";
  FileChangeType3[FileChangeType3["Created"] = 2] = "Created";
  FileChangeType3[FileChangeType3["Deleted"] = 3] = "Deleted";
})(FileChangeType2 || (FileChangeType2 = {}));
var FileSystemError = FileSystemError_1 = class FileSystemError2 extends Error {
  static {
    __name(this, "FileSystemError");
  }
  static FileExists(messageOrUri) {
    return new FileSystemError_1(messageOrUri, FileSystemProviderErrorCode.FileExists, FileSystemError_1.FileExists);
  }
  static FileNotFound(messageOrUri) {
    return new FileSystemError_1(messageOrUri, FileSystemProviderErrorCode.FileNotFound, FileSystemError_1.FileNotFound);
  }
  static FileNotADirectory(messageOrUri) {
    return new FileSystemError_1(messageOrUri, FileSystemProviderErrorCode.FileNotADirectory, FileSystemError_1.FileNotADirectory);
  }
  static FileIsADirectory(messageOrUri) {
    return new FileSystemError_1(messageOrUri, FileSystemProviderErrorCode.FileIsADirectory, FileSystemError_1.FileIsADirectory);
  }
  static NoPermissions(messageOrUri) {
    return new FileSystemError_1(messageOrUri, FileSystemProviderErrorCode.NoPermissions, FileSystemError_1.NoPermissions);
  }
  static Unavailable(messageOrUri) {
    return new FileSystemError_1(messageOrUri, FileSystemProviderErrorCode.Unavailable, FileSystemError_1.Unavailable);
  }
  constructor(uriOrMessage, code = FileSystemProviderErrorCode.Unknown, terminator) {
    super(URI.isUri(uriOrMessage) ? uriOrMessage.toString(true) : uriOrMessage);
    this.code = terminator?.name ?? "Unknown";
    markAsFileSystemProviderError(this, code);
    Object.setPrototypeOf(this, FileSystemError_1.prototype);
    if (typeof Error.captureStackTrace === "function" && typeof terminator === "function") {
      Error.captureStackTrace(this, terminator);
    }
  }
};
FileSystemError = FileSystemError_1 = __decorate13([
  es5ClassCompat
], FileSystemError);
var FoldingRange = class FoldingRange2 {
  static {
    __name(this, "FoldingRange");
  }
  constructor(start, end, kind) {
    this.start = start;
    this.end = end;
    this.kind = kind;
  }
};
FoldingRange = __decorate13([
  es5ClassCompat
], FoldingRange);
var FoldingRangeKind;
(function(FoldingRangeKind2) {
  FoldingRangeKind2[FoldingRangeKind2["Comment"] = 1] = "Comment";
  FoldingRangeKind2[FoldingRangeKind2["Imports"] = 2] = "Imports";
  FoldingRangeKind2[FoldingRangeKind2["Region"] = 3] = "Region";
})(FoldingRangeKind || (FoldingRangeKind = {}));
var CommentThreadCollapsibleState;
(function(CommentThreadCollapsibleState2) {
  CommentThreadCollapsibleState2[CommentThreadCollapsibleState2["Collapsed"] = 0] = "Collapsed";
  CommentThreadCollapsibleState2[CommentThreadCollapsibleState2["Expanded"] = 1] = "Expanded";
})(CommentThreadCollapsibleState || (CommentThreadCollapsibleState = {}));
var CommentMode;
(function(CommentMode2) {
  CommentMode2[CommentMode2["Editing"] = 0] = "Editing";
  CommentMode2[CommentMode2["Preview"] = 1] = "Preview";
})(CommentMode || (CommentMode = {}));
var CommentState;
(function(CommentState2) {
  CommentState2[CommentState2["Published"] = 0] = "Published";
  CommentState2[CommentState2["Draft"] = 1] = "Draft";
})(CommentState || (CommentState = {}));
var CommentThreadState;
(function(CommentThreadState2) {
  CommentThreadState2[CommentThreadState2["Unresolved"] = 0] = "Unresolved";
  CommentThreadState2[CommentThreadState2["Resolved"] = 1] = "Resolved";
})(CommentThreadState || (CommentThreadState = {}));
var CommentThreadApplicability;
(function(CommentThreadApplicability2) {
  CommentThreadApplicability2[CommentThreadApplicability2["Current"] = 0] = "Current";
  CommentThreadApplicability2[CommentThreadApplicability2["Outdated"] = 1] = "Outdated";
})(CommentThreadApplicability || (CommentThreadApplicability = {}));
var CommentThreadFocus;
(function(CommentThreadFocus2) {
  CommentThreadFocus2[CommentThreadFocus2["Reply"] = 1] = "Reply";
  CommentThreadFocus2[CommentThreadFocus2["Comment"] = 2] = "Comment";
})(CommentThreadFocus || (CommentThreadFocus = {}));
var SemanticTokensLegend = class {
  static {
    __name(this, "SemanticTokensLegend");
  }
  constructor(tokenTypes, tokenModifiers = []) {
    this.tokenTypes = tokenTypes;
    this.tokenModifiers = tokenModifiers;
  }
};
function isStrArrayOrUndefined(arg) {
  return typeof arg === "undefined" || isStringArray(arg);
}
__name(isStrArrayOrUndefined, "isStrArrayOrUndefined");
var SemanticTokensBuilder = class _SemanticTokensBuilder {
  static {
    __name(this, "SemanticTokensBuilder");
  }
  constructor(legend) {
    this._prevLine = 0;
    this._prevChar = 0;
    this._dataIsSortedAndDeltaEncoded = true;
    this._data = [];
    this._dataLen = 0;
    this._tokenTypeStrToInt = /* @__PURE__ */ new Map();
    this._tokenModifierStrToInt = /* @__PURE__ */ new Map();
    this._hasLegend = false;
    if (legend) {
      this._hasLegend = true;
      for (let i = 0, len = legend.tokenTypes.length; i < len; i++) {
        this._tokenTypeStrToInt.set(legend.tokenTypes[i], i);
      }
      for (let i = 0, len = legend.tokenModifiers.length; i < len; i++) {
        this._tokenModifierStrToInt.set(legend.tokenModifiers[i], i);
      }
    }
  }
  push(arg0, arg1, arg2, arg3, arg4) {
    if (typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "number" && typeof arg3 === "number" && (typeof arg4 === "number" || typeof arg4 === "undefined")) {
      if (typeof arg4 === "undefined") {
        arg4 = 0;
      }
      return this._pushEncoded(arg0, arg1, arg2, arg3, arg4);
    }
    if (Range.isRange(arg0) && typeof arg1 === "string" && isStrArrayOrUndefined(arg2)) {
      return this._push(arg0, arg1, arg2);
    }
    throw illegalArgument();
  }
  _push(range2, tokenType, tokenModifiers) {
    if (!this._hasLegend) {
      throw new Error("Legend must be provided in constructor");
    }
    if (range2.start.line !== range2.end.line) {
      throw new Error("`range` cannot span multiple lines");
    }
    if (!this._tokenTypeStrToInt.has(tokenType)) {
      throw new Error("`tokenType` is not in the provided legend");
    }
    const line = range2.start.line;
    const char = range2.start.character;
    const length = range2.end.character - range2.start.character;
    const nTokenType = this._tokenTypeStrToInt.get(tokenType);
    let nTokenModifiers = 0;
    if (tokenModifiers) {
      for (const tokenModifier of tokenModifiers) {
        if (!this._tokenModifierStrToInt.has(tokenModifier)) {
          throw new Error("`tokenModifier` is not in the provided legend");
        }
        const nTokenModifier = this._tokenModifierStrToInt.get(tokenModifier);
        nTokenModifiers |= 1 << nTokenModifier >>> 0;
      }
    }
    this._pushEncoded(line, char, length, nTokenType, nTokenModifiers);
  }
  _pushEncoded(line, char, length, tokenType, tokenModifiers) {
    if (this._dataIsSortedAndDeltaEncoded && (line < this._prevLine || line === this._prevLine && char < this._prevChar)) {
      this._dataIsSortedAndDeltaEncoded = false;
      const tokenCount = this._data.length / 5 | 0;
      let prevLine = 0;
      let prevChar = 0;
      for (let i = 0; i < tokenCount; i++) {
        let line2 = this._data[5 * i];
        let char2 = this._data[5 * i + 1];
        if (line2 === 0) {
          line2 = prevLine;
          char2 += prevChar;
        } else {
          line2 += prevLine;
        }
        this._data[5 * i] = line2;
        this._data[5 * i + 1] = char2;
        prevLine = line2;
        prevChar = char2;
      }
    }
    let pushLine = line;
    let pushChar = char;
    if (this._dataIsSortedAndDeltaEncoded && this._dataLen > 0) {
      pushLine -= this._prevLine;
      if (pushLine === 0) {
        pushChar -= this._prevChar;
      }
    }
    this._data[this._dataLen++] = pushLine;
    this._data[this._dataLen++] = pushChar;
    this._data[this._dataLen++] = length;
    this._data[this._dataLen++] = tokenType;
    this._data[this._dataLen++] = tokenModifiers;
    this._prevLine = line;
    this._prevChar = char;
  }
  static _sortAndDeltaEncode(data) {
    const pos = [];
    const tokenCount = data.length / 5 | 0;
    for (let i = 0; i < tokenCount; i++) {
      pos[i] = i;
    }
    pos.sort((a, b) => {
      const aLine = data[5 * a];
      const bLine = data[5 * b];
      if (aLine === bLine) {
        const aChar = data[5 * a + 1];
        const bChar = data[5 * b + 1];
        return aChar - bChar;
      }
      return aLine - bLine;
    });
    const result = new Uint32Array(data.length);
    let prevLine = 0;
    let prevChar = 0;
    for (let i = 0; i < tokenCount; i++) {
      const srcOffset = 5 * pos[i];
      const line = data[srcOffset + 0];
      const char = data[srcOffset + 1];
      const length = data[srcOffset + 2];
      const tokenType = data[srcOffset + 3];
      const tokenModifiers = data[srcOffset + 4];
      const pushLine = line - prevLine;
      const pushChar = pushLine === 0 ? char - prevChar : char;
      const dstOffset = 5 * i;
      result[dstOffset + 0] = pushLine;
      result[dstOffset + 1] = pushChar;
      result[dstOffset + 2] = length;
      result[dstOffset + 3] = tokenType;
      result[dstOffset + 4] = tokenModifiers;
      prevLine = line;
      prevChar = char;
    }
    return result;
  }
  build(resultId) {
    if (!this._dataIsSortedAndDeltaEncoded) {
      return new SemanticTokens(_SemanticTokensBuilder._sortAndDeltaEncode(this._data), resultId);
    }
    return new SemanticTokens(new Uint32Array(this._data), resultId);
  }
};
var SemanticTokens = class {
  static {
    __name(this, "SemanticTokens");
  }
  constructor(data, resultId) {
    this.resultId = resultId;
    this.data = data;
  }
};
var SemanticTokensEdit = class {
  static {
    __name(this, "SemanticTokensEdit");
  }
  constructor(start, deleteCount, data) {
    this.start = start;
    this.deleteCount = deleteCount;
    this.data = data;
  }
};
var SemanticTokensEdits = class {
  static {
    __name(this, "SemanticTokensEdits");
  }
  constructor(edits, resultId) {
    this.resultId = resultId;
    this.edits = edits;
  }
};
var DebugConsoleMode;
(function(DebugConsoleMode2) {
  DebugConsoleMode2[DebugConsoleMode2["Separate"] = 0] = "Separate";
  DebugConsoleMode2[DebugConsoleMode2["MergeWithParent"] = 1] = "MergeWithParent";
})(DebugConsoleMode || (DebugConsoleMode = {}));
var DebugVisualization = class {
  static {
    __name(this, "DebugVisualization");
  }
  constructor(name) {
    this.name = name;
  }
};
var QuickInputButtonLocation;
(function(QuickInputButtonLocation2) {
  QuickInputButtonLocation2[QuickInputButtonLocation2["Title"] = 1] = "Title";
  QuickInputButtonLocation2[QuickInputButtonLocation2["Inline"] = 2] = "Inline";
  QuickInputButtonLocation2[QuickInputButtonLocation2["Input"] = 3] = "Input";
})(QuickInputButtonLocation || (QuickInputButtonLocation = {}));
var QuickInputButtons = class QuickInputButtons2 {
  static {
    __name(this, "QuickInputButtons");
  }
  static {
    this.Back = { iconPath: new ThemeIcon2("arrow-left") };
  }
  constructor() {
  }
};
QuickInputButtons = __decorate13([
  es5ClassCompat
], QuickInputButtons);
var QuickPickItemKind;
(function(QuickPickItemKind2) {
  QuickPickItemKind2[QuickPickItemKind2["Separator"] = -1] = "Separator";
  QuickPickItemKind2[QuickPickItemKind2["Default"] = 0] = "Default";
})(QuickPickItemKind || (QuickPickItemKind = {}));
var InputBoxValidationSeverity;
(function(InputBoxValidationSeverity2) {
  InputBoxValidationSeverity2[InputBoxValidationSeverity2["Info"] = 1] = "Info";
  InputBoxValidationSeverity2[InputBoxValidationSeverity2["Warning"] = 2] = "Warning";
  InputBoxValidationSeverity2[InputBoxValidationSeverity2["Error"] = 3] = "Error";
})(InputBoxValidationSeverity || (InputBoxValidationSeverity = {}));
var ExtensionKind;
(function(ExtensionKind2) {
  ExtensionKind2[ExtensionKind2["UI"] = 1] = "UI";
  ExtensionKind2[ExtensionKind2["Workspace"] = 2] = "Workspace";
})(ExtensionKind || (ExtensionKind = {}));
var FileDecoration = class {
  static {
    __name(this, "FileDecoration");
  }
  static validate(d) {
    if (typeof d.badge === "string") {
      let len = nextCharLength(d.badge, 0);
      if (len < d.badge.length) {
        len += nextCharLength(d.badge, len);
      }
      if (d.badge.length > len) {
        throw new Error(`The 'badge'-property must be undefined or a short character`);
      }
    } else if (d.badge) {
      if (!ThemeIcon2.isThemeIcon(d.badge)) {
        throw new Error(`The 'badge'-property is not a valid ThemeIcon`);
      }
    }
    if (!d.color && !d.badge && !d.tooltip) {
      throw new Error(`The decoration is empty`);
    }
    return true;
  }
  constructor(badge, tooltip, color) {
    this.badge = badge;
    this.tooltip = tooltip;
    this.color = color;
  }
};
var ColorTheme = class ColorTheme2 {
  static {
    __name(this, "ColorTheme");
  }
  constructor(kind) {
    this.kind = kind;
  }
};
ColorTheme = __decorate13([
  es5ClassCompat
], ColorTheme);
var ColorThemeKind;
(function(ColorThemeKind2) {
  ColorThemeKind2[ColorThemeKind2["Light"] = 1] = "Light";
  ColorThemeKind2[ColorThemeKind2["Dark"] = 2] = "Dark";
  ColorThemeKind2[ColorThemeKind2["HighContrast"] = 3] = "HighContrast";
  ColorThemeKind2[ColorThemeKind2["HighContrastLight"] = 4] = "HighContrastLight";
})(ColorThemeKind || (ColorThemeKind = {}));
var CellErrorStackFrame = class {
  static {
    __name(this, "CellErrorStackFrame");
  }
  /**
   * @param label The name of the stack frame
   * @param file The file URI of the stack frame
   * @param position The position of the stack frame within the file
   */
  constructor(label, uri, position) {
    this.label = label;
    this.uri = uri;
    this.position = position;
  }
};
var NotebookCellExecutionState;
(function(NotebookCellExecutionState2) {
  NotebookCellExecutionState2[NotebookCellExecutionState2["Idle"] = 1] = "Idle";
  NotebookCellExecutionState2[NotebookCellExecutionState2["Pending"] = 2] = "Pending";
  NotebookCellExecutionState2[NotebookCellExecutionState2["Executing"] = 3] = "Executing";
})(NotebookCellExecutionState || (NotebookCellExecutionState = {}));
var NotebookCellStatusBarAlignment;
(function(NotebookCellStatusBarAlignment2) {
  NotebookCellStatusBarAlignment2[NotebookCellStatusBarAlignment2["Left"] = 1] = "Left";
  NotebookCellStatusBarAlignment2[NotebookCellStatusBarAlignment2["Right"] = 2] = "Right";
})(NotebookCellStatusBarAlignment || (NotebookCellStatusBarAlignment = {}));
var NotebookEditorRevealType;
(function(NotebookEditorRevealType2) {
  NotebookEditorRevealType2[NotebookEditorRevealType2["Default"] = 0] = "Default";
  NotebookEditorRevealType2[NotebookEditorRevealType2["InCenter"] = 1] = "InCenter";
  NotebookEditorRevealType2[NotebookEditorRevealType2["InCenterIfOutsideViewport"] = 2] = "InCenterIfOutsideViewport";
  NotebookEditorRevealType2[NotebookEditorRevealType2["AtTop"] = 3] = "AtTop";
})(NotebookEditorRevealType || (NotebookEditorRevealType = {}));
var NotebookCellStatusBarItem = class {
  static {
    __name(this, "NotebookCellStatusBarItem");
  }
  constructor(text, alignment) {
    this.text = text;
    this.alignment = alignment;
  }
};
var NotebookControllerAffinity;
(function(NotebookControllerAffinity3) {
  NotebookControllerAffinity3[NotebookControllerAffinity3["Default"] = 1] = "Default";
  NotebookControllerAffinity3[NotebookControllerAffinity3["Preferred"] = 2] = "Preferred";
})(NotebookControllerAffinity || (NotebookControllerAffinity = {}));
var NotebookControllerAffinity2;
(function(NotebookControllerAffinity22) {
  NotebookControllerAffinity22[NotebookControllerAffinity22["Default"] = 1] = "Default";
  NotebookControllerAffinity22[NotebookControllerAffinity22["Preferred"] = 2] = "Preferred";
  NotebookControllerAffinity22[NotebookControllerAffinity22["Hidden"] = -1] = "Hidden";
})(NotebookControllerAffinity2 || (NotebookControllerAffinity2 = {}));
var NotebookRendererScript = class {
  static {
    __name(this, "NotebookRendererScript");
  }
  constructor(uri, provides = []) {
    this.uri = uri;
    this.provides = asArray(provides);
  }
};
var NotebookKernelSourceAction = class {
  static {
    __name(this, "NotebookKernelSourceAction");
  }
  constructor(label) {
    this.label = label;
  }
};
var NotebookVariablesRequestKind;
(function(NotebookVariablesRequestKind2) {
  NotebookVariablesRequestKind2[NotebookVariablesRequestKind2["Named"] = 1] = "Named";
  NotebookVariablesRequestKind2[NotebookVariablesRequestKind2["Indexed"] = 2] = "Indexed";
})(NotebookVariablesRequestKind || (NotebookVariablesRequestKind = {}));
var TimelineItem = class TimelineItem2 {
  static {
    __name(this, "TimelineItem");
  }
  constructor(label, timestamp) {
    this.label = label;
    this.timestamp = timestamp;
  }
};
TimelineItem = __decorate13([
  es5ClassCompat
], TimelineItem);
var ExtensionMode;
(function(ExtensionMode2) {
  ExtensionMode2[ExtensionMode2["Production"] = 1] = "Production";
  ExtensionMode2[ExtensionMode2["Development"] = 2] = "Development";
  ExtensionMode2[ExtensionMode2["Test"] = 3] = "Test";
})(ExtensionMode || (ExtensionMode = {}));
var ExtensionRuntime;
(function(ExtensionRuntime2) {
  ExtensionRuntime2[ExtensionRuntime2["Node"] = 1] = "Node";
  ExtensionRuntime2[ExtensionRuntime2["Webworker"] = 2] = "Webworker";
})(ExtensionRuntime || (ExtensionRuntime = {}));
var StandardTokenType;
(function(StandardTokenType2) {
  StandardTokenType2[StandardTokenType2["Other"] = 0] = "Other";
  StandardTokenType2[StandardTokenType2["Comment"] = 1] = "Comment";
  StandardTokenType2[StandardTokenType2["String"] = 2] = "String";
  StandardTokenType2[StandardTokenType2["RegEx"] = 3] = "RegEx";
})(StandardTokenType || (StandardTokenType = {}));
var LinkedEditingRanges = class {
  static {
    __name(this, "LinkedEditingRanges");
  }
  constructor(ranges, wordPattern) {
    this.ranges = ranges;
    this.wordPattern = wordPattern;
  }
};
var PortAttributes = class {
  static {
    __name(this, "PortAttributes");
  }
  constructor(autoForwardAction) {
    this._autoForwardAction = autoForwardAction;
  }
  get autoForwardAction() {
    return this._autoForwardAction;
  }
};
var TestResultState;
(function(TestResultState2) {
  TestResultState2[TestResultState2["Queued"] = 1] = "Queued";
  TestResultState2[TestResultState2["Running"] = 2] = "Running";
  TestResultState2[TestResultState2["Passed"] = 3] = "Passed";
  TestResultState2[TestResultState2["Failed"] = 4] = "Failed";
  TestResultState2[TestResultState2["Skipped"] = 5] = "Skipped";
  TestResultState2[TestResultState2["Errored"] = 6] = "Errored";
})(TestResultState || (TestResultState = {}));
var TestRunProfileKind;
(function(TestRunProfileKind2) {
  TestRunProfileKind2[TestRunProfileKind2["Run"] = 1] = "Run";
  TestRunProfileKind2[TestRunProfileKind2["Debug"] = 2] = "Debug";
  TestRunProfileKind2[TestRunProfileKind2["Coverage"] = 3] = "Coverage";
})(TestRunProfileKind || (TestRunProfileKind = {}));
var TestRunProfileBase = class {
  static {
    __name(this, "TestRunProfileBase");
  }
  constructor(controllerId, profileId, kind) {
    this.controllerId = controllerId;
    this.profileId = profileId;
    this.kind = kind;
  }
};
var TestRunRequest = class TestRunRequest2 {
  static {
    __name(this, "TestRunRequest");
  }
  constructor(include = void 0, exclude = void 0, profile = void 0, continuous = false, preserveFocus = true) {
    this.include = include;
    this.exclude = exclude;
    this.profile = profile;
    this.continuous = continuous;
    this.preserveFocus = preserveFocus;
  }
};
TestRunRequest = __decorate13([
  es5ClassCompat
], TestRunRequest);
var TestMessage = TestMessage_1 = class TestMessage2 {
  static {
    __name(this, "TestMessage");
  }
  static diff(message, expected, actual) {
    const msg = new TestMessage_1(message);
    msg.expectedOutput = expected;
    msg.actualOutput = actual;
    return msg;
  }
  constructor(message) {
    this.message = message;
  }
};
TestMessage = TestMessage_1 = __decorate13([
  es5ClassCompat
], TestMessage);
var TestTag = class TestTag2 {
  static {
    __name(this, "TestTag");
  }
  constructor(id2) {
    this.id = id2;
  }
};
TestTag = __decorate13([
  es5ClassCompat
], TestTag);
var TestMessageStackFrame = class {
  static {
    __name(this, "TestMessageStackFrame");
  }
  /**
   * @param label The name of the stack frame
   * @param file The file URI of the stack frame
   * @param position The position of the stack frame within the file
   */
  constructor(label, uri, position) {
    this.label = label;
    this.uri = uri;
    this.position = position;
  }
};
var TestCoverageCount = class {
  static {
    __name(this, "TestCoverageCount");
  }
  constructor(covered, total) {
    this.covered = covered;
    this.total = total;
    validateTestCoverageCount(this);
  }
};
function validateTestCoverageCount(cc) {
  if (!cc) {
    return;
  }
  if (cc.covered > cc.total) {
    throw new Error(`The total number of covered items (${cc.covered}) cannot be greater than the total (${cc.total})`);
  }
  if (cc.total < 0) {
    throw new Error(`The number of covered items (${cc.total}) cannot be negative`);
  }
}
__name(validateTestCoverageCount, "validateTestCoverageCount");
var FileCoverage = class _FileCoverage {
  static {
    __name(this, "FileCoverage");
  }
  static fromDetails(uri, details) {
    const statements = new TestCoverageCount(0, 0);
    const branches = new TestCoverageCount(0, 0);
    const decl = new TestCoverageCount(0, 0);
    for (const detail of details) {
      if ("branches" in detail) {
        statements.total += 1;
        statements.covered += detail.executed ? 1 : 0;
        for (const branch of detail.branches) {
          branches.total += 1;
          branches.covered += branch.executed ? 1 : 0;
        }
      } else {
        decl.total += 1;
        decl.covered += detail.executed ? 1 : 0;
      }
    }
    const coverage = new _FileCoverage(uri, statements, branches.total > 0 ? branches : void 0, decl.total > 0 ? decl : void 0);
    coverage.detailedCoverage = details;
    return coverage;
  }
  constructor(uri, statementCoverage, branchCoverage, declarationCoverage, includesTests = []) {
    this.uri = uri;
    this.statementCoverage = statementCoverage;
    this.branchCoverage = branchCoverage;
    this.declarationCoverage = declarationCoverage;
    this.includesTests = includesTests;
  }
};
var StatementCoverage = class {
  static {
    __name(this, "StatementCoverage");
  }
  // back compat until finalization:
  get executionCount() {
    return +this.executed;
  }
  set executionCount(n) {
    this.executed = n;
  }
  constructor(executed, location, branches = []) {
    this.executed = executed;
    this.location = location;
    this.branches = branches;
  }
};
var BranchCoverage = class {
  static {
    __name(this, "BranchCoverage");
  }
  // back compat until finalization:
  get executionCount() {
    return +this.executed;
  }
  set executionCount(n) {
    this.executed = n;
  }
  constructor(executed, location, label) {
    this.executed = executed;
    this.location = location;
    this.label = label;
  }
};
var DeclarationCoverage = class {
  static {
    __name(this, "DeclarationCoverage");
  }
  // back compat until finalization:
  get executionCount() {
    return +this.executed;
  }
  set executionCount(n) {
    this.executed = n;
  }
  constructor(name, executed, location) {
    this.name = name;
    this.executed = executed;
    this.location = location;
  }
};
var ExternalUriOpenerPriority;
(function(ExternalUriOpenerPriority2) {
  ExternalUriOpenerPriority2[ExternalUriOpenerPriority2["None"] = 0] = "None";
  ExternalUriOpenerPriority2[ExternalUriOpenerPriority2["Option"] = 1] = "Option";
  ExternalUriOpenerPriority2[ExternalUriOpenerPriority2["Default"] = 2] = "Default";
  ExternalUriOpenerPriority2[ExternalUriOpenerPriority2["Preferred"] = 3] = "Preferred";
})(ExternalUriOpenerPriority || (ExternalUriOpenerPriority = {}));
var WorkspaceTrustState;
(function(WorkspaceTrustState2) {
  WorkspaceTrustState2[WorkspaceTrustState2["Untrusted"] = 0] = "Untrusted";
  WorkspaceTrustState2[WorkspaceTrustState2["Trusted"] = 1] = "Trusted";
  WorkspaceTrustState2[WorkspaceTrustState2["Unspecified"] = 2] = "Unspecified";
})(WorkspaceTrustState || (WorkspaceTrustState = {}));
var PortAutoForwardAction;
(function(PortAutoForwardAction2) {
  PortAutoForwardAction2[PortAutoForwardAction2["Notify"] = 1] = "Notify";
  PortAutoForwardAction2[PortAutoForwardAction2["OpenBrowser"] = 2] = "OpenBrowser";
  PortAutoForwardAction2[PortAutoForwardAction2["OpenPreview"] = 3] = "OpenPreview";
  PortAutoForwardAction2[PortAutoForwardAction2["Silent"] = 4] = "Silent";
  PortAutoForwardAction2[PortAutoForwardAction2["Ignore"] = 5] = "Ignore";
  PortAutoForwardAction2[PortAutoForwardAction2["OpenBrowserOnce"] = 6] = "OpenBrowserOnce";
})(PortAutoForwardAction || (PortAutoForwardAction = {}));
var TypeHierarchyItem = class {
  static {
    __name(this, "TypeHierarchyItem");
  }
  constructor(kind, name, detail, uri, range2, selectionRange) {
    this.kind = kind;
    this.name = name;
    this.detail = detail;
    this.uri = uri;
    this.range = range2;
    this.selectionRange = selectionRange;
  }
};
var TextTabInput = class {
  static {
    __name(this, "TextTabInput");
  }
  constructor(uri) {
    this.uri = uri;
  }
};
var TextDiffTabInput = class {
  static {
    __name(this, "TextDiffTabInput");
  }
  constructor(original, modified) {
    this.original = original;
    this.modified = modified;
  }
};
var TextMergeTabInput = class {
  static {
    __name(this, "TextMergeTabInput");
  }
  constructor(base, input1, input2, result) {
    this.base = base;
    this.input1 = input1;
    this.input2 = input2;
    this.result = result;
  }
};
var CustomEditorTabInput = class {
  static {
    __name(this, "CustomEditorTabInput");
  }
  constructor(uri, viewType) {
    this.uri = uri;
    this.viewType = viewType;
  }
};
var WebviewEditorTabInput = class {
  static {
    __name(this, "WebviewEditorTabInput");
  }
  constructor(viewType) {
    this.viewType = viewType;
  }
};
var NotebookEditorTabInput = class {
  static {
    __name(this, "NotebookEditorTabInput");
  }
  constructor(uri, notebookType) {
    this.uri = uri;
    this.notebookType = notebookType;
  }
};
var NotebookDiffEditorTabInput = class {
  static {
    __name(this, "NotebookDiffEditorTabInput");
  }
  constructor(original, modified, notebookType) {
    this.original = original;
    this.modified = modified;
    this.notebookType = notebookType;
  }
};
var TerminalEditorTabInput = class {
  static {
    __name(this, "TerminalEditorTabInput");
  }
  constructor() {
  }
};
var InteractiveWindowInput = class {
  static {
    __name(this, "InteractiveWindowInput");
  }
  constructor(uri, inputBoxUri) {
    this.uri = uri;
    this.inputBoxUri = inputBoxUri;
  }
};
var ChatEditorTabInput = class {
  static {
    __name(this, "ChatEditorTabInput");
  }
  constructor() {
  }
};
var TextMultiDiffTabInput = class {
  static {
    __name(this, "TextMultiDiffTabInput");
  }
  constructor(textDiffs) {
    this.textDiffs = textDiffs;
  }
};
var InteractiveSessionVoteDirection;
(function(InteractiveSessionVoteDirection2) {
  InteractiveSessionVoteDirection2[InteractiveSessionVoteDirection2["Down"] = 0] = "Down";
  InteractiveSessionVoteDirection2[InteractiveSessionVoteDirection2["Up"] = 1] = "Up";
})(InteractiveSessionVoteDirection || (InteractiveSessionVoteDirection = {}));
var ChatCopyKind;
(function(ChatCopyKind2) {
  ChatCopyKind2[ChatCopyKind2["Action"] = 1] = "Action";
  ChatCopyKind2[ChatCopyKind2["Toolbar"] = 2] = "Toolbar";
})(ChatCopyKind || (ChatCopyKind = {}));
var ChatVariableLevel;
(function(ChatVariableLevel2) {
  ChatVariableLevel2[ChatVariableLevel2["Short"] = 1] = "Short";
  ChatVariableLevel2[ChatVariableLevel2["Medium"] = 2] = "Medium";
  ChatVariableLevel2[ChatVariableLevel2["Full"] = 3] = "Full";
})(ChatVariableLevel || (ChatVariableLevel = {}));
var ChatCompletionItem = class {
  static {
    __name(this, "ChatCompletionItem");
  }
  constructor(id2, label, values) {
    this.id = id2;
    this.label = label;
    this.values = values;
  }
};
var ChatEditingSessionActionOutcome;
(function(ChatEditingSessionActionOutcome2) {
  ChatEditingSessionActionOutcome2[ChatEditingSessionActionOutcome2["Accepted"] = 1] = "Accepted";
  ChatEditingSessionActionOutcome2[ChatEditingSessionActionOutcome2["Rejected"] = 2] = "Rejected";
  ChatEditingSessionActionOutcome2[ChatEditingSessionActionOutcome2["Saved"] = 3] = "Saved";
})(ChatEditingSessionActionOutcome || (ChatEditingSessionActionOutcome = {}));
var ChatRequestEditedFileEventKind;
(function(ChatRequestEditedFileEventKind2) {
  ChatRequestEditedFileEventKind2[ChatRequestEditedFileEventKind2["Keep"] = 1] = "Keep";
  ChatRequestEditedFileEventKind2[ChatRequestEditedFileEventKind2["Undo"] = 2] = "Undo";
  ChatRequestEditedFileEventKind2[ChatRequestEditedFileEventKind2["UserModification"] = 3] = "UserModification";
})(ChatRequestEditedFileEventKind || (ChatRequestEditedFileEventKind = {}));
var InteractiveEditorResponseFeedbackKind;
(function(InteractiveEditorResponseFeedbackKind2) {
  InteractiveEditorResponseFeedbackKind2[InteractiveEditorResponseFeedbackKind2["Unhelpful"] = 0] = "Unhelpful";
  InteractiveEditorResponseFeedbackKind2[InteractiveEditorResponseFeedbackKind2["Helpful"] = 1] = "Helpful";
  InteractiveEditorResponseFeedbackKind2[InteractiveEditorResponseFeedbackKind2["Undone"] = 2] = "Undone";
  InteractiveEditorResponseFeedbackKind2[InteractiveEditorResponseFeedbackKind2["Accepted"] = 3] = "Accepted";
  InteractiveEditorResponseFeedbackKind2[InteractiveEditorResponseFeedbackKind2["Bug"] = 4] = "Bug";
})(InteractiveEditorResponseFeedbackKind || (InteractiveEditorResponseFeedbackKind = {}));
var ChatResultFeedbackKind;
(function(ChatResultFeedbackKind2) {
  ChatResultFeedbackKind2[ChatResultFeedbackKind2["Unhelpful"] = 0] = "Unhelpful";
  ChatResultFeedbackKind2[ChatResultFeedbackKind2["Helpful"] = 1] = "Helpful";
})(ChatResultFeedbackKind || (ChatResultFeedbackKind = {}));
var ChatResponseMarkdownPart = class {
  static {
    __name(this, "ChatResponseMarkdownPart");
  }
  constructor(value) {
    if (typeof value !== "string" && value.isTrusted === true) {
      throw new Error("The boolean form of MarkdownString.isTrusted is NOT supported for chat participants.");
    }
    this.value = typeof value === "string" ? new MarkdownString2(value) : value;
  }
};
var ChatResponseMarkdownWithVulnerabilitiesPart = class {
  static {
    __name(this, "ChatResponseMarkdownWithVulnerabilitiesPart");
  }
  constructor(value, vulnerabilities) {
    if (typeof value !== "string" && value.isTrusted === true) {
      throw new Error("The boolean form of MarkdownString.isTrusted is NOT supported for chat participants.");
    }
    this.value = typeof value === "string" ? new MarkdownString2(value) : value;
    this.vulnerabilities = vulnerabilities;
  }
};
var ChatResponseConfirmationPart = class {
  static {
    __name(this, "ChatResponseConfirmationPart");
  }
  constructor(title, message, data, buttons) {
    this.title = title;
    this.message = message;
    this.data = data;
    this.buttons = buttons;
  }
};
var ChatResponseFileTreePart = class {
  static {
    __name(this, "ChatResponseFileTreePart");
  }
  constructor(value, baseUri) {
    this.value = value;
    this.baseUri = baseUri;
  }
};
var ChatResponseMultiDiffPart = class {
  static {
    __name(this, "ChatResponseMultiDiffPart");
  }
  constructor(value, title, readOnly) {
    this.value = value;
    this.title = title;
    this.readOnly = readOnly;
  }
};
var McpToolInvocationContentData = class {
  static {
    __name(this, "McpToolInvocationContentData");
  }
  constructor(data, mimeType) {
    this.data = data;
    this.mimeType = mimeType;
  }
};
var ChatSubagentToolInvocationData = class {
  static {
    __name(this, "ChatSubagentToolInvocationData");
  }
  constructor(description, agentName, prompt, result) {
    this.description = description;
    this.agentName = agentName;
    this.prompt = prompt;
    this.result = result;
  }
};
var ChatResponseExternalEditPart = class {
  static {
    __name(this, "ChatResponseExternalEditPart");
  }
  constructor(uris, callback) {
    this.uris = uris;
    this.callback = callback;
    this.applied = new Promise((resolve2) => {
      this.didGetApplied = resolve2;
    });
  }
};
var ChatResponseAnchorPart = class {
  static {
    __name(this, "ChatResponseAnchorPart");
  }
  constructor(value, title) {
    this.value = value;
    this.value2 = value;
    this.title = title;
  }
};
var ChatResponseProgressPart = class {
  static {
    __name(this, "ChatResponseProgressPart");
  }
  constructor(value) {
    this.value = value;
  }
};
var ChatResponseProgressPart2 = class {
  static {
    __name(this, "ChatResponseProgressPart2");
  }
  constructor(value, task) {
    this.value = value;
    this.task = task;
  }
};
var ChatResponseThinkingProgressPart = class {
  static {
    __name(this, "ChatResponseThinkingProgressPart");
  }
  constructor(value, id2, metadata) {
    this.value = value;
    this.id = id2;
    this.metadata = metadata;
  }
};
var ChatResponseHookPart = class {
  static {
    __name(this, "ChatResponseHookPart");
  }
  constructor(hookType, stopReason, systemMessage, metadata) {
    this.hookType = hookType;
    this.stopReason = stopReason;
    this.systemMessage = systemMessage;
    this.metadata = metadata;
  }
};
var ChatResponseWarningPart = class {
  static {
    __name(this, "ChatResponseWarningPart");
  }
  constructor(value) {
    if (typeof value !== "string" && value.isTrusted === true) {
      throw new Error("The boolean form of MarkdownString.isTrusted is NOT supported for chat participants.");
    }
    this.value = typeof value === "string" ? new MarkdownString2(value) : value;
  }
};
var ChatResponseInfoPart = class {
  static {
    __name(this, "ChatResponseInfoPart");
  }
  constructor(value) {
    if (typeof value !== "string" && value.isTrusted === true) {
      throw new Error("The boolean form of MarkdownString.isTrusted is NOT supported for chat participants.");
    }
    this.value = typeof value === "string" ? new MarkdownString2(value) : value;
  }
};
var ChatResponseCommandButtonPart = class {
  static {
    __name(this, "ChatResponseCommandButtonPart");
  }
  constructor(value) {
    this.value = value;
  }
};
var ChatResponseReferencePart = class {
  static {
    __name(this, "ChatResponseReferencePart");
  }
  constructor(value, iconPath, options) {
    this.value = value;
    this.iconPath = iconPath;
    this.options = options;
  }
};
var ChatResponseCodeblockUriPart = class {
  static {
    __name(this, "ChatResponseCodeblockUriPart");
  }
  constructor(value, isEdit, undoStopId) {
    this.value = value;
    this.isEdit = isEdit;
    this.undoStopId = undoStopId;
  }
};
var ChatResponseCodeCitationPart = class {
  static {
    __name(this, "ChatResponseCodeCitationPart");
  }
  constructor(value, license, snippet) {
    this.value = value;
    this.license = license;
    this.snippet = snippet;
  }
};
var ChatResponseMovePart = class {
  static {
    __name(this, "ChatResponseMovePart");
  }
  constructor(uri, range2) {
    this.uri = uri;
    this.range = range2;
  }
};
var ChatResponseExtensionsPart = class {
  static {
    __name(this, "ChatResponseExtensionsPart");
  }
  constructor(extensions) {
    this.extensions = extensions;
  }
};
var ChatResponsePullRequestPart = class {
  static {
    __name(this, "ChatResponsePullRequestPart");
  }
  constructor(uriOrCommand, title, description, author, linkTag) {
    this.title = title;
    this.description = description;
    this.author = author;
    this.linkTag = linkTag;
    if (isUriComponents(uriOrCommand)) {
      this.uri = uriOrCommand;
      this.command = {
        title: "Open Pull Request",
        command: "vscode.open",
        arguments: [uriOrCommand]
      };
    } else {
      this.command = uriOrCommand;
    }
  }
  toJSON() {
    return {
      $mid: 26,
      uri: this.uri,
      title: this.title,
      description: this.description,
      author: this.author
    };
  }
};
var ChatQuestionType;
(function(ChatQuestionType2) {
  ChatQuestionType2[ChatQuestionType2["Text"] = 1] = "Text";
  ChatQuestionType2[ChatQuestionType2["SingleSelect"] = 2] = "SingleSelect";
  ChatQuestionType2[ChatQuestionType2["MultiSelect"] = 3] = "MultiSelect";
})(ChatQuestionType || (ChatQuestionType = {}));
var ChatQuestion = class {
  static {
    __name(this, "ChatQuestion");
  }
  constructor(id2, type, title, options) {
    this.id = id2;
    this.type = type;
    this.title = title;
    this.message = options?.message;
    this.options = options?.options;
    this.defaultValue = options?.defaultValue;
    this.allowFreeformInput = options?.allowFreeformInput;
  }
};
var ChatResponseQuestionCarouselPart = class {
  static {
    __name(this, "ChatResponseQuestionCarouselPart");
  }
  constructor(questions, allowSkip = true) {
    this.questions = questions;
    this.allowSkip = allowSkip;
  }
};
var ChatResponseTextEditPart = class {
  static {
    __name(this, "ChatResponseTextEditPart");
  }
  constructor(uri, editsOrDone) {
    this.uri = uri;
    if (editsOrDone === true) {
      this.isDone = true;
      this.edits = [];
    } else {
      this.edits = Array.isArray(editsOrDone) ? editsOrDone : [editsOrDone];
    }
  }
};
var ChatResponseNotebookEditPart = class {
  static {
    __name(this, "ChatResponseNotebookEditPart");
  }
  constructor(uri, editsOrDone) {
    this.uri = uri;
    if (editsOrDone === true) {
      this.isDone = true;
      this.edits = [];
    } else {
      this.edits = Array.isArray(editsOrDone) ? editsOrDone : [editsOrDone];
    }
  }
};
var ChatResponseWorkspaceEditPart = class {
  static {
    __name(this, "ChatResponseWorkspaceEditPart");
  }
  constructor(edits) {
    this.edits = edits;
  }
};
var ChatTodoStatus;
(function(ChatTodoStatus2) {
  ChatTodoStatus2[ChatTodoStatus2["NotStarted"] = 1] = "NotStarted";
  ChatTodoStatus2[ChatTodoStatus2["InProgress"] = 2] = "InProgress";
  ChatTodoStatus2[ChatTodoStatus2["Completed"] = 3] = "Completed";
})(ChatTodoStatus || (ChatTodoStatus = {}));
var ChatDebugSubagentStatus;
(function(ChatDebugSubagentStatus2) {
  ChatDebugSubagentStatus2[ChatDebugSubagentStatus2["Running"] = 0] = "Running";
  ChatDebugSubagentStatus2[ChatDebugSubagentStatus2["Completed"] = 1] = "Completed";
  ChatDebugSubagentStatus2[ChatDebugSubagentStatus2["Failed"] = 2] = "Failed";
})(ChatDebugSubagentStatus || (ChatDebugSubagentStatus = {}));
var ChatToolInvocationPart = class {
  static {
    __name(this, "ChatToolInvocationPart");
  }
  constructor(toolName, toolCallId, errorMessage) {
    this.toolName = toolName;
    this.toolCallId = toolCallId;
    this.errorMessage = errorMessage;
  }
};
var ChatRequestTurn = class {
  static {
    __name(this, "ChatRequestTurn");
  }
  constructor(prompt, command, references, participant, toolReferences, editedFileEvents, id2, modelId, modeInstructions2) {
    this.prompt = prompt;
    this.command = command;
    this.references = references;
    this.participant = participant;
    this.toolReferences = toolReferences;
    this.editedFileEvents = editedFileEvents;
    this.id = id2;
    this.modelId = modelId;
    this.modeInstructions2 = modeInstructions2;
  }
};
var ChatResponseTurn = class {
  static {
    __name(this, "ChatResponseTurn");
  }
  constructor(response, result, participant, command) {
    this.response = response;
    this.result = result;
    this.participant = participant;
    this.command = command;
  }
};
var ChatResponseTurn2 = class {
  static {
    __name(this, "ChatResponseTurn2");
  }
  constructor(response, result, participant, command) {
    this.response = response;
    this.result = result;
    this.participant = participant;
    this.command = command;
  }
};
var ChatLocation;
(function(ChatLocation2) {
  ChatLocation2[ChatLocation2["Panel"] = 1] = "Panel";
  ChatLocation2[ChatLocation2["Terminal"] = 2] = "Terminal";
  ChatLocation2[ChatLocation2["Notebook"] = 3] = "Notebook";
  ChatLocation2[ChatLocation2["Editor"] = 4] = "Editor";
})(ChatLocation || (ChatLocation = {}));
var ChatSessionStatus;
(function(ChatSessionStatus2) {
  ChatSessionStatus2[ChatSessionStatus2["Failed"] = 0] = "Failed";
  ChatSessionStatus2[ChatSessionStatus2["Completed"] = 1] = "Completed";
  ChatSessionStatus2[ChatSessionStatus2["InProgress"] = 2] = "InProgress";
  ChatSessionStatus2[ChatSessionStatus2["NeedsInput"] = 3] = "NeedsInput";
})(ChatSessionStatus || (ChatSessionStatus = {}));
var ChatSessionCustomizationType = class _ChatSessionCustomizationType {
  static {
    __name(this, "ChatSessionCustomizationType");
  }
  static {
    this.Agent = new _ChatSessionCustomizationType("agent");
  }
  static {
    this.Skill = new _ChatSessionCustomizationType("skill");
  }
  static {
    this.Instructions = new _ChatSessionCustomizationType("instructions");
  }
  static {
    this.Prompt = new _ChatSessionCustomizationType("prompt");
  }
  static {
    this.Hook = new _ChatSessionCustomizationType("hook");
  }
  static {
    this.Plugins = new _ChatSessionCustomizationType("plugins");
  }
  constructor(id2) {
    this.id = id2;
  }
};
var ChatDebugLogLevel;
(function(ChatDebugLogLevel2) {
  ChatDebugLogLevel2[ChatDebugLogLevel2["Trace"] = 0] = "Trace";
  ChatDebugLogLevel2[ChatDebugLogLevel2["Info"] = 1] = "Info";
  ChatDebugLogLevel2[ChatDebugLogLevel2["Warning"] = 2] = "Warning";
  ChatDebugLogLevel2[ChatDebugLogLevel2["Error"] = 3] = "Error";
})(ChatDebugLogLevel || (ChatDebugLogLevel = {}));
var ChatDebugToolCallResult;
(function(ChatDebugToolCallResult2) {
  ChatDebugToolCallResult2[ChatDebugToolCallResult2["Success"] = 0] = "Success";
  ChatDebugToolCallResult2[ChatDebugToolCallResult2["Error"] = 1] = "Error";
})(ChatDebugToolCallResult || (ChatDebugToolCallResult = {}));
var ChatDebugHookResult;
(function(ChatDebugHookResult2) {
  ChatDebugHookResult2[ChatDebugHookResult2["Success"] = 0] = "Success";
  ChatDebugHookResult2[ChatDebugHookResult2["Error"] = 1] = "Error";
  ChatDebugHookResult2[ChatDebugHookResult2["NonBlockingError"] = 2] = "NonBlockingError";
})(ChatDebugHookResult || (ChatDebugHookResult = {}));
var ChatDebugToolCallEvent = class {
  static {
    __name(this, "ChatDebugToolCallEvent");
  }
  constructor(toolName, created) {
    this._kind = "toolCall";
    this.toolName = toolName;
    this.created = created;
  }
};
var ChatDebugModelTurnEvent = class {
  static {
    __name(this, "ChatDebugModelTurnEvent");
  }
  constructor(created) {
    this._kind = "modelTurn";
    this.created = created;
  }
};
var ChatDebugGenericEvent = class {
  static {
    __name(this, "ChatDebugGenericEvent");
  }
  constructor(name, level, created) {
    this._kind = "generic";
    this.name = name;
    this.level = level;
    this.created = created;
  }
};
var ChatDebugSubagentInvocationEvent = class {
  static {
    __name(this, "ChatDebugSubagentInvocationEvent");
  }
  constructor(agentName, created) {
    this._kind = "subagentInvocation";
    this.agentName = agentName;
    this.created = created;
  }
};
var ChatDebugMessageSection = class {
  static {
    __name(this, "ChatDebugMessageSection");
  }
  constructor(name, content) {
    this.name = name;
    this.content = content;
  }
};
var ChatDebugUserMessageEvent = class {
  static {
    __name(this, "ChatDebugUserMessageEvent");
  }
  constructor(message, created) {
    this._kind = "userMessage";
    this.message = message;
    this.created = created;
    this.sections = [];
  }
};
var ChatDebugAgentResponseEvent = class {
  static {
    __name(this, "ChatDebugAgentResponseEvent");
  }
  constructor(message, created) {
    this._kind = "agentResponse";
    this.message = message;
    this.created = created;
    this.sections = [];
  }
};
var ChatDebugEventTextContent = class {
  static {
    __name(this, "ChatDebugEventTextContent");
  }
  constructor(value) {
    this._kind = "text";
    this.value = value;
  }
};
var ChatDebugMessageContentType;
(function(ChatDebugMessageContentType2) {
  ChatDebugMessageContentType2[ChatDebugMessageContentType2["User"] = 0] = "User";
  ChatDebugMessageContentType2[ChatDebugMessageContentType2["Agent"] = 1] = "Agent";
})(ChatDebugMessageContentType || (ChatDebugMessageContentType = {}));
var ChatDebugEventMessageContent = class {
  static {
    __name(this, "ChatDebugEventMessageContent");
  }
  constructor(type, message, sections) {
    this._kind = "messageContent";
    this.type = type;
    this.message = message;
    this.sections = sections;
  }
};
var ChatDebugEventToolCallContent = class {
  static {
    __name(this, "ChatDebugEventToolCallContent");
  }
  constructor(toolName) {
    this._kind = "toolCallContent";
    this.toolName = toolName;
  }
};
var ChatDebugEventModelTurnContent = class {
  static {
    __name(this, "ChatDebugEventModelTurnContent");
  }
  constructor(requestName) {
    this._kind = "modelTurnContent";
    this.requestName = requestName;
  }
};
var ChatDebugEventHookContent = class {
  static {
    __name(this, "ChatDebugEventHookContent");
  }
  constructor(hookType) {
    this._kind = "hookContent";
    this.hookType = hookType;
  }
};
var ChatSessionChangedFile = class {
  static {
    __name(this, "ChatSessionChangedFile");
  }
  constructor(uri, originalUri, modifiedUri, insertions, deletions) {
    this.uri = uri;
    this.originalUri = originalUri;
    this.modifiedUri = modifiedUri;
    this.insertions = insertions;
    this.deletions = deletions;
  }
};
var ChatResponseReferencePartStatusKind;
(function(ChatResponseReferencePartStatusKind2) {
  ChatResponseReferencePartStatusKind2[ChatResponseReferencePartStatusKind2["Complete"] = 1] = "Complete";
  ChatResponseReferencePartStatusKind2[ChatResponseReferencePartStatusKind2["Partial"] = 2] = "Partial";
  ChatResponseReferencePartStatusKind2[ChatResponseReferencePartStatusKind2["Omitted"] = 3] = "Omitted";
})(ChatResponseReferencePartStatusKind || (ChatResponseReferencePartStatusKind = {}));
var ChatResponseClearToPreviousToolInvocationReason;
(function(ChatResponseClearToPreviousToolInvocationReason2) {
  ChatResponseClearToPreviousToolInvocationReason2[ChatResponseClearToPreviousToolInvocationReason2["NoReason"] = 0] = "NoReason";
  ChatResponseClearToPreviousToolInvocationReason2[ChatResponseClearToPreviousToolInvocationReason2["FilteredContentRetry"] = 1] = "FilteredContentRetry";
  ChatResponseClearToPreviousToolInvocationReason2[ChatResponseClearToPreviousToolInvocationReason2["CopyrightContentRetry"] = 2] = "CopyrightContentRetry";
})(ChatResponseClearToPreviousToolInvocationReason || (ChatResponseClearToPreviousToolInvocationReason = {}));
var ChatRequestEditorData = class {
  static {
    __name(this, "ChatRequestEditorData");
  }
  constructor(editor, document2, selection, wholeRange) {
    this.editor = editor;
    this.document = document2;
    this.selection = selection;
    this.wholeRange = wholeRange;
  }
};
var ChatRequestNotebookData = class {
  static {
    __name(this, "ChatRequestNotebookData");
  }
  constructor(cell) {
    this.cell = cell;
  }
};
var ChatReferenceBinaryData = class {
  static {
    __name(this, "ChatReferenceBinaryData");
  }
  constructor(mimeType, data, reference) {
    this.mimeType = mimeType;
    this.data = data;
    this.reference = reference;
  }
};
var ChatReferenceDiagnostic = class {
  static {
    __name(this, "ChatReferenceDiagnostic");
  }
  constructor(diagnostics) {
    this.diagnostics = diagnostics;
  }
};
var LanguageModelChatMessageRole;
(function(LanguageModelChatMessageRole2) {
  LanguageModelChatMessageRole2[LanguageModelChatMessageRole2["User"] = 1] = "User";
  LanguageModelChatMessageRole2[LanguageModelChatMessageRole2["Assistant"] = 2] = "Assistant";
  LanguageModelChatMessageRole2[LanguageModelChatMessageRole2["System"] = 3] = "System";
})(LanguageModelChatMessageRole || (LanguageModelChatMessageRole = {}));
var LanguageModelToolResultPart = class {
  static {
    __name(this, "LanguageModelToolResultPart");
  }
  constructor(callId, content, isError) {
    this.callId = callId;
    this.content = content;
    this.isError = isError ?? false;
  }
};
var ChatErrorLevel;
(function(ChatErrorLevel2) {
  ChatErrorLevel2[ChatErrorLevel2["Info"] = 0] = "Info";
  ChatErrorLevel2[ChatErrorLevel2["Warning"] = 1] = "Warning";
  ChatErrorLevel2[ChatErrorLevel2["Error"] = 2] = "Error";
})(ChatErrorLevel || (ChatErrorLevel = {}));
var LanguageModelChatMessage = class _LanguageModelChatMessage {
  static {
    __name(this, "LanguageModelChatMessage");
  }
  static User(content, name) {
    return new _LanguageModelChatMessage(LanguageModelChatMessageRole.User, content, name);
  }
  static Assistant(content, name) {
    return new _LanguageModelChatMessage(LanguageModelChatMessageRole.Assistant, content, name);
  }
  set content(value) {
    if (typeof value === "string") {
      this._content = [new LanguageModelTextPart(value)];
    } else {
      this._content = value;
    }
  }
  get content() {
    return this._content;
  }
  constructor(role, content, name) {
    this._content = [];
    this.role = role;
    this.content = content;
    this.name = name;
  }
};
var LanguageModelChatMessage2 = class _LanguageModelChatMessage2 {
  static {
    __name(this, "LanguageModelChatMessage2");
  }
  static User(content, name) {
    return new _LanguageModelChatMessage2(LanguageModelChatMessageRole.User, content, name);
  }
  static Assistant(content, name) {
    return new _LanguageModelChatMessage2(LanguageModelChatMessageRole.Assistant, content, name);
  }
  set content(value) {
    if (typeof value === "string") {
      this._content = [new LanguageModelTextPart(value)];
    } else {
      this._content = value;
    }
  }
  get content() {
    return this._content;
  }
  // Temp to avoid breaking changes
  set content2(value) {
    if (value) {
      this.content = value.map((part) => {
        if (typeof part === "string") {
          return new LanguageModelTextPart(part);
        }
        return part;
      });
    }
  }
  get content2() {
    return this.content.map((part) => {
      if (part instanceof LanguageModelTextPart) {
        return part.value;
      }
      return part;
    });
  }
  constructor(role, content, name) {
    this._content = [];
    this.role = role;
    this.content = content;
    this.name = name;
  }
};
var LanguageModelToolCallPart = class {
  static {
    __name(this, "LanguageModelToolCallPart");
  }
  constructor(callId, name, input) {
    this.callId = callId;
    this.name = name;
    this.input = input;
  }
};
var LanguageModelPartAudience;
(function(LanguageModelPartAudience2) {
  LanguageModelPartAudience2[LanguageModelPartAudience2["Assistant"] = 0] = "Assistant";
  LanguageModelPartAudience2[LanguageModelPartAudience2["User"] = 1] = "User";
  LanguageModelPartAudience2[LanguageModelPartAudience2["Extension"] = 2] = "Extension";
})(LanguageModelPartAudience || (LanguageModelPartAudience = {}));
var LanguageModelTextPart = class {
  static {
    __name(this, "LanguageModelTextPart");
  }
  constructor(value, audience) {
    this.value = value;
    audience = audience;
  }
  toJSON() {
    return {
      $mid: 21,
      value: this.value,
      audience: this.audience
    };
  }
};
var LanguageModelDataPart = class _LanguageModelDataPart {
  static {
    __name(this, "LanguageModelDataPart");
  }
  constructor(data, mimeType, audience) {
    this.mimeType = mimeType;
    this.data = data;
    this.audience = audience;
  }
  static image(data, mimeType) {
    return new _LanguageModelDataPart(data, mimeType);
  }
  static json(value, mime = "text/x-json") {
    const rawStr = JSON.stringify(value, void 0, "	");
    return new _LanguageModelDataPart(VSBuffer.fromString(rawStr).buffer, mime);
  }
  static text(value, mime = Mimes.text) {
    return new _LanguageModelDataPart(VSBuffer.fromString(value).buffer, mime);
  }
  toJSON() {
    return {
      $mid: 24,
      mimeType: this.mimeType,
      data: encodeBase64(VSBuffer.wrap(this.data)),
      audience: this.audience
    };
  }
};
var ChatImageMimeType;
(function(ChatImageMimeType2) {
  ChatImageMimeType2["PNG"] = "image/png";
  ChatImageMimeType2["JPEG"] = "image/jpeg";
  ChatImageMimeType2["GIF"] = "image/gif";
  ChatImageMimeType2["WEBP"] = "image/webp";
  ChatImageMimeType2["BMP"] = "image/bmp";
})(ChatImageMimeType || (ChatImageMimeType = {}));
var LanguageModelThinkingPart = class {
  static {
    __name(this, "LanguageModelThinkingPart");
  }
  constructor(value, id2, metadata) {
    this.value = value;
    this.id = id2;
    this.metadata = metadata;
  }
  toJSON() {
    return {
      $mid: 22,
      value: this.value,
      id: this.id,
      metadata: this.metadata
    };
  }
};
var LanguageModelPromptTsxPart = class {
  static {
    __name(this, "LanguageModelPromptTsxPart");
  }
  constructor(value) {
    this.value = value;
  }
  toJSON() {
    return {
      $mid: 23,
      value: this.value
    };
  }
};
var LanguageModelChatSystemMessage = class {
  static {
    __name(this, "LanguageModelChatSystemMessage");
  }
  constructor(content) {
    this.content = content;
  }
};
var LanguageModelChatUserMessage = class {
  static {
    __name(this, "LanguageModelChatUserMessage");
  }
  constructor(content, name) {
    this.content = content;
    this.name = name;
  }
};
var LanguageModelChatAssistantMessage = class {
  static {
    __name(this, "LanguageModelChatAssistantMessage");
  }
  constructor(content, name) {
    this.content = content;
    this.name = name;
  }
};
var LanguageModelError = class _LanguageModelError extends Error {
  static {
    __name(this, "LanguageModelError");
  }
  static #name = "LanguageModelError";
  static NotFound(message) {
    return new _LanguageModelError(message, _LanguageModelError.NotFound.name);
  }
  static NoPermissions(message) {
    return new _LanguageModelError(message, _LanguageModelError.NoPermissions.name);
  }
  static Blocked(message) {
    return new _LanguageModelError(message, _LanguageModelError.Blocked.name);
  }
  static tryDeserialize(data) {
    if (data.name !== _LanguageModelError.#name) {
      return void 0;
    }
    return new _LanguageModelError(data.message, data.code, data.cause);
  }
  constructor(message, code, cause) {
    super(message, { cause });
    this.name = _LanguageModelError.#name;
    this.code = code ?? "";
  }
};
var LanguageModelToolResult = class {
  static {
    __name(this, "LanguageModelToolResult");
  }
  constructor(content) {
    this.content = content;
  }
  toJSON() {
    return {
      $mid: 20,
      content: this.content
    };
  }
};
var LanguageModelToolResult2 = class {
  static {
    __name(this, "LanguageModelToolResult2");
  }
  constructor(content) {
    this.content = content;
  }
  toJSON() {
    return {
      $mid: 20,
      content: this.content
    };
  }
};
var ExtendedLanguageModelToolResult = class extends LanguageModelToolResult {
  static {
    __name(this, "ExtendedLanguageModelToolResult");
  }
};
var LanguageModelChatToolMode;
(function(LanguageModelChatToolMode2) {
  LanguageModelChatToolMode2[LanguageModelChatToolMode2["Auto"] = 1] = "Auto";
  LanguageModelChatToolMode2[LanguageModelChatToolMode2["Required"] = 2] = "Required";
})(LanguageModelChatToolMode || (LanguageModelChatToolMode = {}));
var LanguageModelToolExtensionSource = class {
  static {
    __name(this, "LanguageModelToolExtensionSource");
  }
  constructor(id2, label) {
    this.id = id2;
    this.label = label;
  }
};
var LanguageModelToolMCPSource = class {
  static {
    __name(this, "LanguageModelToolMCPSource");
  }
  constructor(label, name, instructions) {
    this.label = label;
    this.name = name;
    this.instructions = instructions;
  }
};
var RelatedInformationType;
(function(RelatedInformationType2) {
  RelatedInformationType2[RelatedInformationType2["SymbolInformation"] = 1] = "SymbolInformation";
  RelatedInformationType2[RelatedInformationType2["CommandInformation"] = 2] = "CommandInformation";
  RelatedInformationType2[RelatedInformationType2["SearchInformation"] = 3] = "SearchInformation";
  RelatedInformationType2[RelatedInformationType2["SettingInformation"] = 4] = "SettingInformation";
})(RelatedInformationType || (RelatedInformationType = {}));
var SettingsSearchResultKind;
(function(SettingsSearchResultKind2) {
  SettingsSearchResultKind2[SettingsSearchResultKind2["EMBEDDED"] = 1] = "EMBEDDED";
  SettingsSearchResultKind2[SettingsSearchResultKind2["LLM_RANKED"] = 2] = "LLM_RANKED";
  SettingsSearchResultKind2[SettingsSearchResultKind2["CANCELED"] = 3] = "CANCELED";
})(SettingsSearchResultKind || (SettingsSearchResultKind = {}));
var SpeechToTextStatus;
(function(SpeechToTextStatus2) {
  SpeechToTextStatus2[SpeechToTextStatus2["Started"] = 1] = "Started";
  SpeechToTextStatus2[SpeechToTextStatus2["Recognizing"] = 2] = "Recognizing";
  SpeechToTextStatus2[SpeechToTextStatus2["Recognized"] = 3] = "Recognized";
  SpeechToTextStatus2[SpeechToTextStatus2["Stopped"] = 4] = "Stopped";
  SpeechToTextStatus2[SpeechToTextStatus2["Error"] = 5] = "Error";
})(SpeechToTextStatus || (SpeechToTextStatus = {}));
var TextToSpeechStatus;
(function(TextToSpeechStatus2) {
  TextToSpeechStatus2[TextToSpeechStatus2["Started"] = 1] = "Started";
  TextToSpeechStatus2[TextToSpeechStatus2["Stopped"] = 2] = "Stopped";
  TextToSpeechStatus2[TextToSpeechStatus2["Error"] = 3] = "Error";
})(TextToSpeechStatus || (TextToSpeechStatus = {}));
var KeywordRecognitionStatus;
(function(KeywordRecognitionStatus2) {
  KeywordRecognitionStatus2[KeywordRecognitionStatus2["Recognized"] = 1] = "Recognized";
  KeywordRecognitionStatus2[KeywordRecognitionStatus2["Stopped"] = 2] = "Stopped";
})(KeywordRecognitionStatus || (KeywordRecognitionStatus = {}));
var McpToolAvailability;
(function(McpToolAvailability2) {
  McpToolAvailability2[McpToolAvailability2["Initial"] = 0] = "Initial";
  McpToolAvailability2[McpToolAvailability2["Dynamic"] = 1] = "Dynamic";
})(McpToolAvailability || (McpToolAvailability = {}));
var McpStdioServerDefinition = class {
  static {
    __name(this, "McpStdioServerDefinition");
  }
  constructor(label, command, args, env2 = {}, version, metadata) {
    this.label = label;
    this.command = command;
    this.args = args;
    this.env = env2;
    this.version = version;
    this.metadata = metadata;
  }
};
var McpHttpServerDefinition = class {
  static {
    __name(this, "McpHttpServerDefinition");
  }
  constructor(label, uri, headers = {}, version, metadata, authentication) {
    this.label = label;
    this.uri = uri;
    this.headers = headers;
    this.version = version;
    this.metadata = metadata;
    this.authentication = authentication;
  }
};

// Source/TypeConverter/Main/MarkdownString.ts
var FromAPI = /* @__PURE__ */ __name((MarkdownStringInstance) => ({
  value: MarkdownStringInstance.value,
  // FIX: Handle exactOptionalPropertyTypes
  ...MarkdownStringInstance.isTrusted && {
    isTrusted: MarkdownStringInstance.isTrusted
  },
  ...MarkdownStringInstance.baseUri && {
    baseUri: MarkdownStringInstance.baseUri
  },
  ...MarkdownStringInstance.supportHtml && {
    supportHtml: MarkdownStringInstance.supportHtml
  }
}), "FromAPI");
var ToAPI = /* @__PURE__ */ __name((MarkdownStringDTO) => {
  const result = new MarkdownString2(
    MarkdownStringDTO.value,
    typeof MarkdownStringDTO.isTrusted === "boolean" ? MarkdownStringDTO.isTrusted : !!MarkdownStringDTO.isTrusted
  );
  if (MarkdownStringDTO.baseUri) {
    result.baseUri = MarkdownStringDTO.baseUri;
  }
  if (MarkdownStringDTO.supportHtml) {
    result.supportHtml = MarkdownStringDTO.supportHtml;
  }
  return result;
}, "ToAPI");
export {
  FromAPI,
  ToAPI
};
//# sourceMappingURL=MarkdownString.js.map
