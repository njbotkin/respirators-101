(function () {
'use strict';

var combineArrays$1 = function combineArrays(obj) {
	var keys = Object.keys(obj);

	keys.forEach(function (key) {
		if (!Array.isArray(obj[key])) {
			throw new Error(key + ' is not an array');
		}
	});

	var maxIndex = keys.reduce(function (maxSoFar, key) {
		var len = obj[key].length;
		return maxSoFar > len ? maxSoFar : len;
	}, 0);

	var output = [];

	function getObject(index) {
		var o = {};
		keys.forEach(function (key) {
			o[key] = obj[key][index];
		});
		return o;
	}

	for (var i = 0; i < maxIndex; ++i) {
		output.push(getObject(i));
	}

	return output;
};

var isarray = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

/**
 * Expose `pathToRegexp`.
 */
var pathToRegexpWithReversibleKeys$1 = pathToRegexp;

/**
 * The main path matching regexp utility.
 *
 * @type {RegExp}
 */
var PATH_REGEXP = new RegExp([
// Match escaped characters that would otherwise appear in future matches.
// This allows the user to escape special characters that won't transform.
'(\\\\.)',
// Match Express-style parameters and un-named parameters with a prefix
// and optional suffixes. Matches appear as:
//
// "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?"]
// "/route(\\d+)" => [undefined, undefined, undefined, "\d+", undefined]
'([\\/.])?(?:\\:(\\w+)(?:\\(((?:\\\\.|[^)])*)\\))?|\\(((?:\\\\.|[^)])*)\\))([+*?])?',
// Match regexp special characters that are always escaped.
'([.+*?=^!:${}()[\\]|\\/])'].join('|'), 'g');

/**
 * Escape the capturing group by escaping special characters and meaning.
 *
 * @param  {String} group
 * @return {String}
 */
function escapeGroup(group) {
  return group.replace(/([=!:$\/()])/g, '\\$1');
}

/**
 * Attach the keys as a property of the regexp.
 *
 * @param  {RegExp} re
 * @param  {Array}  keys
 * @return {RegExp}
 */
function attachKeys(re, keys, allTokens) {
  re.keys = keys;
  re.allTokens = allTokens;
  return re;
}

/**
 * Get the flags for a regexp from the options.
 *
 * @param  {Object} options
 * @return {String}
 */
function flags(options) {
  return options.sensitive ? '' : 'i';
}

/**
 * Pull out keys from a regexp.
 *
 * @param  {RegExp} path
 * @param  {Array}  keys
 * @return {RegExp}
 */
function regexpToRegexp(path, keys, allTokens) {
  // Use a negative lookahead to match only capturing groups.
  var groups = path.source.match(/\((?!\?)/g);

  if (groups) {
    for (var i = 0; i < groups.length; i++) {
      keys.push({
        name: i,
        delimiter: null,
        optional: false,
        repeat: false
      });
    }
  }

  return attachKeys(path, keys, allTokens);
}

/**
 * Transform an array into a regexp.
 *
 * @param  {Array}  path
 * @param  {Array}  keys
 * @param  {Object} options
 * @return {RegExp}
 */
function arrayToRegexp(path, keys, options, allTokens) {
  var parts = [];

  for (var i = 0; i < path.length; i++) {
    parts.push(pathToRegexp(path[i], keys, options, allTokens).source);
  }

  var regexp = new RegExp('(?:' + parts.join('|') + ')', flags(options));
  return attachKeys(regexp, keys, allTokens);
}

/**
 * Replace the specific tags with regexp strings.
 *
 * @param  {String} path
 * @param  {Array}  keys
 * @return {String}
 */
function replacePath(path, keys, allTokens) {
  var index = 0;
  var lastEndIndex = 0;

  function addLastToken(lastToken) {
    if (lastEndIndex === 0 && lastToken[0] !== '/') {
      lastToken = '/' + lastToken;
    }
    allTokens.push({
      string: lastToken
    });
  }

  function replace(match, escaped, prefix, key, capture, group, suffix, escape, offset) {
    if (escaped) {
      return escaped;
    }

    if (escape) {
      return '\\' + escape;
    }

    var repeat = suffix === '+' || suffix === '*';
    var optional = suffix === '?' || suffix === '*';

    if (offset > lastEndIndex) {
      addLastToken(path.substring(lastEndIndex, offset));
    }

    lastEndIndex = offset + match.length;

    var newKey = {
      name: key || index++,
      delimiter: prefix || '/',
      optional: optional,
      repeat: repeat
    };

    keys.push(newKey);
    allTokens.push(newKey);

    prefix = prefix ? '\\' + prefix : '';
    capture = escapeGroup(capture || group || '[^' + (prefix || '\\/') + ']+?');

    if (repeat) {
      capture = capture + '(?:' + prefix + capture + ')*';
    }

    if (optional) {
      return '(?:' + prefix + '(' + capture + '))?';
    }

    // Basic parameter support.
    return prefix + '(' + capture + ')';
  }

  var newPath = path.replace(PATH_REGEXP, replace);

  if (lastEndIndex < path.length) {
    addLastToken(path.substring(lastEndIndex));
  }

  return newPath;
}

/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array can be passed in for the keys, which will hold the
 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
 *
 * @param  {(String|RegExp|Array)} path
 * @param  {Array}                 [keys]
 * @param  {Object}                [options]
 * @return {RegExp}
 */
function pathToRegexp(path, keys, options, allTokens) {
  keys = keys || [];
  allTokens = allTokens || [];

  if (!isarray(keys)) {
    options = keys;
    keys = [];
  } else if (!options) {
    options = {};
  }

  if (path instanceof RegExp) {
    return regexpToRegexp(path, keys, options, allTokens);
  }

  if (isarray(path)) {
    return arrayToRegexp(path, keys, options, allTokens);
  }

  var strict = options.strict;
  var end = options.end !== false;
  var route = replacePath(path, keys, allTokens);
  var endsWithSlash = path.charAt(path.length - 1) === '/';

  // In non-strict mode we allow a slash at the end of match. If the path to
  // match already ends with a slash, we remove it for consistency. The slash
  // is valid at the end of a path match, not in the middle. This is important
  // in non-ending mode, where "/test/" shouldn't match "/test//route".
  if (!strict) {
    route = (endsWithSlash ? route.slice(0, -2) : route) + '(?:\\/(?=$))?';
  }

  if (end) {
    route += '$';
  } else {
    // In non-ending mode, we need the capturing groups to match as much as
    // possible by using a positive lookahead to the end or next path segment.
    route += strict && endsWithSlash ? '' : '(?=\\/|$)';
  }

  return attachKeys(new RegExp('^' + route, flags(options)), keys, allTokens);
}

var _typeof$1 = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};























































var toConsumableArray = function (arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

    return arr2;
  } else {
    return Array.from(arr);
  }
};

var thenDenodeify$1 = function denodeify(fn) {
	return function () {
		var self = this;
		var args = Array.prototype.slice.call(arguments);
		return new Promise(function (resolve, reject) {
			args.push(function (err, res) {
				if (err) {
					reject(err);
				} else {
					resolve(res);
				}
			});

			var res = fn.apply(self, args);

			var isPromise = res && ((typeof res === 'undefined' ? 'undefined' : _typeof$1(res)) === 'object' || typeof res === 'function') && typeof res.then === 'function';

			if (isPromise) {
				resolve(res);
			}
		});
	};
};

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};





function createCommonjsModule$1(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var eventemitter3$1 = createCommonjsModule$1(function (module) {
  var has = Object.prototype.hasOwnProperty,
      prefix = '~';

  /**
   * Constructor to create a storage for our `EE` objects.
   * An `Events` instance is a plain object whose properties are event names.
   *
   * @constructor
   * @api private
   */
  function Events() {}

  //
  // We try to not inherit from `Object.prototype`. In some engines creating an
  // instance in this way is faster than calling `Object.create(null)` directly.
  // If `Object.create(null)` is not supported we prefix the event names with a
  // character to make sure that the built-in object properties are not
  // overridden or used as an attack vector.
  //
  if (Object.create) {
    Events.prototype = Object.create(null);

    //
    // This hack is needed because the `__proto__` property is still inherited in
    // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
    //
    if (!new Events().__proto__) prefix = false;
  }

  /**
   * Representation of a single event listener.
   *
   * @param {Function} fn The listener function.
   * @param {Mixed} context The context to invoke the listener with.
   * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
   * @constructor
   * @api private
   */
  function EE(fn, context, once) {
    this.fn = fn;
    this.context = context;
    this.once = once || false;
  }

  /**
   * Minimal `EventEmitter` interface that is molded against the Node.js
   * `EventEmitter` interface.
   *
   * @constructor
   * @api public
   */
  function EventEmitter() {
    this._events = new Events();
    this._eventsCount = 0;
  }

  /**
   * Return an array listing the events for which the emitter has registered
   * listeners.
   *
   * @returns {Array}
   * @api public
   */
  EventEmitter.prototype.eventNames = function eventNames() {
    var names = [],
        events,
        name;

    if (this._eventsCount === 0) return names;

    for (name in events = this._events) {
      if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
    }

    if (Object.getOwnPropertySymbols) {
      return names.concat(Object.getOwnPropertySymbols(events));
    }

    return names;
  };

  /**
   * Return the listeners registered for a given event.
   *
   * @param {String|Symbol} event The event name.
   * @param {Boolean} exists Only check if there are listeners.
   * @returns {Array|Boolean}
   * @api public
   */
  EventEmitter.prototype.listeners = function listeners(event, exists) {
    var evt = prefix ? prefix + event : event,
        available = this._events[evt];

    if (exists) return !!available;
    if (!available) return [];
    if (available.fn) return [available.fn];

    for (var i = 0, l = available.length, ee = new Array(l); i < l; i++) {
      ee[i] = available[i].fn;
    }

    return ee;
  };

  /**
   * Calls each of the listeners registered for a given event.
   *
   * @param {String|Symbol} event The event name.
   * @returns {Boolean} `true` if the event had listeners, else `false`.
   * @api public
   */
  EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
    var evt = prefix ? prefix + event : event;

    if (!this._events[evt]) return false;

    var listeners = this._events[evt],
        len = arguments.length,
        args,
        i;

    if (listeners.fn) {
      if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

      switch (len) {
        case 1:
          return listeners.fn.call(listeners.context), true;
        case 2:
          return listeners.fn.call(listeners.context, a1), true;
        case 3:
          return listeners.fn.call(listeners.context, a1, a2), true;
        case 4:
          return listeners.fn.call(listeners.context, a1, a2, a3), true;
        case 5:
          return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
        case 6:
          return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
      }

      for (i = 1, args = new Array(len - 1); i < len; i++) {
        args[i - 1] = arguments[i];
      }

      listeners.fn.apply(listeners.context, args);
    } else {
      var length = listeners.length,
          j;

      for (i = 0; i < length; i++) {
        if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

        switch (len) {
          case 1:
            listeners[i].fn.call(listeners[i].context);break;
          case 2:
            listeners[i].fn.call(listeners[i].context, a1);break;
          case 3:
            listeners[i].fn.call(listeners[i].context, a1, a2);break;
          case 4:
            listeners[i].fn.call(listeners[i].context, a1, a2, a3);break;
          default:
            if (!args) for (j = 1, args = new Array(len - 1); j < len; j++) {
              args[j - 1] = arguments[j];
            }

            listeners[i].fn.apply(listeners[i].context, args);
        }
      }
    }

    return true;
  };

  /**
   * Add a listener for a given event.
   *
   * @param {String|Symbol} event The event name.
   * @param {Function} fn The listener function.
   * @param {Mixed} [context=this] The context to invoke the listener with.
   * @returns {EventEmitter} `this`.
   * @api public
   */
  EventEmitter.prototype.on = function on(event, fn, context) {
    var listener = new EE(fn, context || this),
        evt = prefix ? prefix + event : event;

    if (!this._events[evt]) this._events[evt] = listener, this._eventsCount++;else if (!this._events[evt].fn) this._events[evt].push(listener);else this._events[evt] = [this._events[evt], listener];

    return this;
  };

  /**
   * Add a one-time listener for a given event.
   *
   * @param {String|Symbol} event The event name.
   * @param {Function} fn The listener function.
   * @param {Mixed} [context=this] The context to invoke the listener with.
   * @returns {EventEmitter} `this`.
   * @api public
   */
  EventEmitter.prototype.once = function once(event, fn, context) {
    var listener = new EE(fn, context || this, true),
        evt = prefix ? prefix + event : event;

    if (!this._events[evt]) this._events[evt] = listener, this._eventsCount++;else if (!this._events[evt].fn) this._events[evt].push(listener);else this._events[evt] = [this._events[evt], listener];

    return this;
  };

  /**
   * Remove the listeners of a given event.
   *
   * @param {String|Symbol} event The event name.
   * @param {Function} fn Only remove the listeners that match this function.
   * @param {Mixed} context Only remove the listeners that have this context.
   * @param {Boolean} once Only remove one-time listeners.
   * @returns {EventEmitter} `this`.
   * @api public
   */
  EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
    var evt = prefix ? prefix + event : event;

    if (!this._events[evt]) return this;
    if (!fn) {
      if (--this._eventsCount === 0) this._events = new Events();else delete this._events[evt];
      return this;
    }

    var listeners = this._events[evt];

    if (listeners.fn) {
      if (listeners.fn === fn && (!once || listeners.once) && (!context || listeners.context === context)) {
        if (--this._eventsCount === 0) this._events = new Events();else delete this._events[evt];
      }
    } else {
      for (var i = 0, events = [], length = listeners.length; i < length; i++) {
        if (listeners[i].fn !== fn || once && !listeners[i].once || context && listeners[i].context !== context) {
          events.push(listeners[i]);
        }
      }

      //
      // Reset the array, or remove it completely if we have no more listeners.
      //
      if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;else if (--this._eventsCount === 0) this._events = new Events();else delete this._events[evt];
    }

    return this;
  };

  /**
   * Remove all listeners, or those of the specified event.
   *
   * @param {String|Symbol} [event] The event name.
   * @returns {EventEmitter} `this`.
   * @api public
   */
  EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
    var evt;

    if (event) {
      evt = prefix ? prefix + event : event;
      if (this._events[evt]) {
        if (--this._eventsCount === 0) this._events = new Events();else delete this._events[evt];
      }
    } else {
      this._events = new Events();
      this._eventsCount = 0;
    }

    return this;
  };

  //
  // Alias methods names because people roll like that.
  //
  EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  //
  // This function doesn't apply anymore.
  //
  EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
    return this;
  };

  //
  // Expose the prefix.
  //
  EventEmitter.prefixed = prefix;

  //
  // Allow `EventEmitter` to be imported as module namespace.
  //
  EventEmitter.EventEmitter = EventEmitter;

  //
  // Expose the module.
  //
  {
    module.exports = EventEmitter;
  }
});

var strictUriEncode = function strictUriEncode(str) {
	return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
		return '%' + c.charCodeAt(0).toString(16).toUpperCase();
	});
};

/*
object-assign
(c) Sindre Sorhus
@license MIT
*/

/* eslint-disable no-unused-vars */

var getOwnPropertySymbols = Object.getOwnPropertySymbols;
var hasOwnProperty = Object.prototype.hasOwnProperty;
var propIsEnumerable = Object.prototype.propertyIsEnumerable;

function toObject(val) {
	if (val === null || val === undefined) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

function shouldUseNative() {
	try {
		if (!Object.assign) {
			return false;
		}

		// Detect buggy property enumeration order in older V8 versions.

		// https://bugs.chromium.org/p/v8/issues/detail?id=4118
		var test1 = new String('abc'); // eslint-disable-line no-new-wrappers
		test1[5] = 'de';
		if (Object.getOwnPropertyNames(test1)[0] === '5') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test2 = {};
		for (var i = 0; i < 10; i++) {
			test2['_' + String.fromCharCode(i)] = i;
		}
		var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
			return test2[n];
		});
		if (order2.join('') !== '0123456789') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test3 = {};
		'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
			test3[letter] = letter;
		});
		if (Object.keys(Object.assign({}, test3)).join('') !== 'abcdefghijklmnopqrst') {
			return false;
		}

		return true;
	} catch (err) {
		// We don't expect any of the above to throw, but better to be safe.
		return false;
	}
}

var objectAssign = shouldUseNative() ? Object.assign : function (target, source) {
	var from;
	var to = toObject(target);
	var symbols;

	for (var s = 1; s < arguments.length; s++) {
		from = Object(arguments[s]);

		for (var key in from) {
			if (hasOwnProperty.call(from, key)) {
				to[key] = from[key];
			}
		}

		if (getOwnPropertySymbols) {
			symbols = getOwnPropertySymbols(from);
			for (var i = 0; i < symbols.length; i++) {
				if (propIsEnumerable.call(from, symbols[i])) {
					to[symbols[i]] = from[symbols[i]];
				}
			}
		}
	}

	return to;
};

function encoderForArrayFormat(opts) {
	switch (opts.arrayFormat) {
		case 'index':
			return function (key, value, index) {
				return value === null ? [encode(key, opts), '[', index, ']'].join('') : [encode(key, opts), '[', encode(index, opts), ']=', encode(value, opts)].join('');
			};

		case 'bracket':
			return function (key, value) {
				return value === null ? encode(key, opts) : [encode(key, opts), '[]=', encode(value, opts)].join('');
			};

		default:
			return function (key, value) {
				return value === null ? encode(key, opts) : [encode(key, opts), '=', encode(value, opts)].join('');
			};
	}
}

function parserForArrayFormat(opts) {
	var result;

	switch (opts.arrayFormat) {
		case 'index':
			return function (key, value, accumulator) {
				result = /\[(\d*)\]$/.exec(key);

				key = key.replace(/\[\d*\]$/, '');

				if (!result) {
					accumulator[key] = value;
					return;
				}

				if (accumulator[key] === undefined) {
					accumulator[key] = {};
				}

				accumulator[key][result[1]] = value;
			};

		case 'bracket':
			return function (key, value, accumulator) {
				result = /(\[\])$/.exec(key);
				key = key.replace(/\[\]$/, '');

				if (!result) {
					accumulator[key] = value;
					return;
				} else if (accumulator[key] === undefined) {
					accumulator[key] = [value];
					return;
				}

				accumulator[key] = [].concat(accumulator[key], value);
			};

		default:
			return function (key, value, accumulator) {
				if (accumulator[key] === undefined) {
					accumulator[key] = value;
					return;
				}

				accumulator[key] = [].concat(accumulator[key], value);
			};
	}
}

function encode(value, opts) {
	if (opts.encode) {
		return opts.strict ? strictUriEncode(value) : encodeURIComponent(value);
	}

	return value;
}

function keysSorter(input) {
	if (Array.isArray(input)) {
		return input.sort();
	} else if ((typeof input === 'undefined' ? 'undefined' : _typeof$1(input)) === 'object') {
		return keysSorter(Object.keys(input)).sort(function (a, b) {
			return Number(a) - Number(b);
		}).map(function (key) {
			return input[key];
		});
	}

	return input;
}

var extract = function extract(str) {
	return str.split('?')[1] || '';
};

var parse = function parse(str, opts) {
	opts = objectAssign({ arrayFormat: 'none' }, opts);

	var formatter = parserForArrayFormat(opts);

	// Create an object with no prototype
	// https://github.com/sindresorhus/query-string/issues/47
	var ret = Object.create(null);

	if (typeof str !== 'string') {
		return ret;
	}

	str = str.trim().replace(/^(\?|#|&)/, '');

	if (!str) {
		return ret;
	}

	str.split('&').forEach(function (param) {
		var parts = param.replace(/\+/g, ' ').split('=');
		// Firefox (pre 40) decodes `%3D` to `=`
		// https://github.com/sindresorhus/query-string/pull/37
		var key = parts.shift();
		var val = parts.length > 0 ? parts.join('=') : undefined;

		// missing `=` should be `null`:
		// http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
		val = val === undefined ? null : decodeURIComponent(val);

		formatter(decodeURIComponent(key), val, ret);
	});

	return Object.keys(ret).sort().reduce(function (result, key) {
		var val = ret[key];
		if (Boolean(val) && (typeof val === 'undefined' ? 'undefined' : _typeof$1(val)) === 'object' && !Array.isArray(val)) {
			// Sort object keys, not values
			result[key] = keysSorter(val);
		} else {
			result[key] = val;
		}

		return result;
	}, Object.create(null));
};

var stringify = function stringify(obj, opts) {
	var defaults$$1 = {
		encode: true,
		strict: true,
		arrayFormat: 'none'
	};

	opts = objectAssign(defaults$$1, opts);

	var formatter = encoderForArrayFormat(opts);

	return obj ? Object.keys(obj).sort().map(function (key) {
		var val = obj[key];

		if (val === undefined) {
			return '';
		}

		if (val === null) {
			return encode(key, opts);
		}

		if (Array.isArray(val)) {
			var result = [];

			val.slice().forEach(function (val2) {
				if (val2 === undefined) {
					return;
				}

				result.push(formatter(key, val2, result.length));
			});

			return result.join('&');
		}

		return encode(key, opts) + '=' + encode(val, opts);
	}).filter(function (x) {
		return x.length > 0;
	}).join('&') : '';
};

var queryString = {
	extract: extract,
	parse: parse,
	stringify: stringify
};

var immutable = extend$1;

var hasOwnProperty$1 = Object.prototype.hasOwnProperty;

function extend$1() {
    var target = {};

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i];

        for (var key in source) {
            if (hasOwnProperty$1.call(source, key)) {
                target[key] = source[key];
            }
        }
    }

    return target;
}

var hashLocation = function HashLocation(window) {
	var emitter = new eventemitter3$1();
	var last = '';
	var needToDecode = getNeedToDecode();

	window.addEventListener('hashchange', function () {
		if (last !== emitter.get()) {
			last = emitter.get();
			emitter.emit('hashchange');
		}
	});

	function ifRouteIsDifferent(actualNavigateFunction) {
		return function navigate(newPath) {
			if (newPath !== last) {
				actualNavigateFunction(window, newPath);
			}
		};
	}

	emitter.go = ifRouteIsDifferent(go);
	emitter.replace = ifRouteIsDifferent(replace);
	emitter.get = get$1.bind(null, window, needToDecode);

	return emitter;
};

function replace(window, newPath) {
	window.location.replace(everythingBeforeTheSlash(window.location.href) + '#' + newPath);
}

function everythingBeforeTheSlash(url) {
	var hashIndex = url.indexOf('#');
	return hashIndex === -1 ? url : url.substring(0, hashIndex);
}

function go(window, newPath) {
	window.location.hash = newPath;
}

function get$1(window, needToDecode) {
	var hash = removeHashFromPath(window.location.hash);
	return needToDecode ? decodeURI(hash) : hash;
}

function removeHashFromPath(path) {
	return path && path[0] === '#' ? path.substr(1) : path;
}

function getNeedToDecode() {
	var a = document.createElement('a');
	a.href = '#x x';
	return !/x x/.test(a.hash);
}

var hashBrownRouter$1 = function Router(opts, hashLocation$$1) {
	var emitter = new eventemitter3$1();
	if (isHashLocation(opts)) {
		hashLocation$$1 = opts;
		opts = null;
	}

	opts = opts || {};

	if (!hashLocation$$1) {
		hashLocation$$1 = hashLocation(window);
	}

	function onNotFound(path, queryStringParameters) {
		emitter.emit('not found', path, queryStringParameters);
	}

	var routes = [];

	var onHashChange = evaluateCurrentPath.bind(null, routes, hashLocation$$1, !!opts.reverse, onNotFound);

	hashLocation$$1.on('hashchange', onHashChange);

	function stop() {
		hashLocation$$1.removeListener('hashchange', onHashChange);
	}

	emitter.add = add.bind(null, routes);
	emitter.stop = stop;
	emitter.evaluateCurrent = evaluateCurrentPathOrGoToDefault.bind(null, routes, hashLocation$$1, !!opts.reverse, onNotFound);
	emitter.replace = hashLocation$$1.replace;
	emitter.go = hashLocation$$1.go;
	emitter.location = hashLocation$$1;

	return emitter;
};

function evaluateCurrentPath(routes, hashLocation$$1, reverse, onNotFound) {
	evaluatePath(routes, hashLocation$$1.get(), reverse, onNotFound);
}

function getPathParts(path) {
	var chunks = path.split('?');
	return {
		path: chunks.shift(),
		queryString: queryString.parse(chunks.join(''))
	};
}

function evaluatePath(routes, path, reverse, onNotFound) {
	var pathParts = getPathParts(path);
	path = pathParts.path;
	var queryStringParameters = pathParts.queryString;

	var matchingRoute = find(reverse ? reverseArray(routes) : routes, path);

	if (matchingRoute) {
		var regexResult = matchingRoute.exec(path);
		var routeParameters = makeParametersObjectFromRegexResult(matchingRoute.keys, regexResult);
		var params = immutable(queryStringParameters, routeParameters);
		matchingRoute.fn(params);
	} else {
		onNotFound(path, queryStringParameters);
	}
}

function reverseArray(ary) {
	return ary.slice().reverse();
}

function makeParametersObjectFromRegexResult(keys, regexResult) {
	return keys.reduce(function (memo, urlKey, index) {
		memo[urlKey.name] = regexResult[index + 1];
		return memo;
	}, {});
}

function add(routes, routeString, routeFunction) {
	if (typeof routeFunction !== 'function') {
		throw new Error('The router add function must be passed a callback function');
	}
	var newRoute = pathToRegexpWithReversibleKeys$1(routeString);
	newRoute.fn = routeFunction;
	routes.push(newRoute);
}

function evaluateCurrentPathOrGoToDefault(routes, hashLocation$$1, reverse, onNotFound, defaultPath) {
	var currentLocation = hashLocation$$1.get();
	var canUseCurrentLocation = currentLocation && (currentLocation !== '/' || defaultPath === '/');

	if (canUseCurrentLocation) {
		var routesCopy = routes.slice();
		evaluateCurrentPath(routesCopy, hashLocation$$1, reverse, onNotFound);
	} else {
		hashLocation$$1.go(defaultPath);
	}
}

function isHashLocation(hashLocation$$1) {
	return hashLocation$$1 && hashLocation$$1.go && hashLocation$$1.replace && hashLocation$$1.on;
}

function find(aryOfRegexes, str) {
	for (var i = 0; i < aryOfRegexes.length; ++i) {
		if (str.match(aryOfRegexes[i])) {
			return aryOfRegexes[i];
		}
	}
}

// This file to be replaced with an official implementation maintained by
// the page.js crew if and when that becomes an option


var pathParser = function pathParser(pathString) {
	var parseResults = pathToRegexpWithReversibleKeys$1(pathString);

	// The only reason I'm returning a new object instead of the results of the pathToRegexp
	// function is so that if the official implementation ends up returning an
	// allTokens-style array via some other mechanism, I may be able to change this file
	// without having to change the rest of the module in index.js
	return {
		regex: parseResults,
		allTokens: parseResults.allTokens
	};
};

var stringifyQuerystring = queryString.stringify;

var pagePathBuilder$1 = function pagePathBuilder(pathStr, parameters) {
	var parsed = typeof pathStr === 'string' ? pathParser(pathStr) : pathStr;
	var allTokens = parsed.allTokens;
	var regex = parsed.regex;

	if (parameters) {
		var path = allTokens.map(function (bit) {
			if (bit.string) {
				return bit.string;
			}

			var defined = typeof parameters[bit.name] !== 'undefined';
			if (!bit.optional && !defined) {
				throw new Error('Must supply argument ' + bit.name + ' for path ' + pathStr);
			}

			return defined ? bit.delimiter + encodeURIComponent(parameters[bit.name]) : '';
		}).join('');

		if (!regex.test(path)) {
			throw new Error('Provided arguments do not match the original arguments');
		}

		return buildPathWithQuerystring(path, parameters, allTokens);
	} else {
		return parsed;
	}
};

function buildPathWithQuerystring(path, parameters, tokenArray) {
	var parametersInQuerystring = getParametersWithoutMatchingToken(parameters, tokenArray);

	if (Object.keys(parametersInQuerystring).length === 0) {
		return path;
	}

	return path + '?' + stringifyQuerystring(parametersInQuerystring);
}

function getParametersWithoutMatchingToken(parameters, tokenArray) {
	var tokenHash = tokenArray.reduce(function (memo, bit) {
		if (!bit.string) {
			memo[bit.name] = bit;
		}
		return memo;
	}, {});

	return Object.keys(parameters).filter(function (param) {
		return !tokenHash[param];
	}).reduce(function (newParameters, param) {
		newParameters[param] = parameters[param];
		return newParameters;
	}, {});
}

var browser = function browser(fn) {
  typeof setImmediate === 'function' ? setImmediate(fn) : setTimeout(fn, 0);
};

function _interopDefault$1(ex) {
	return ex && (typeof ex === 'undefined' ? 'undefined' : _typeof$1(ex)) === 'object' && 'default' in ex ? ex['default'] : ex;
}

var combineArrays = _interopDefault$1(combineArrays$1);
var pathToRegexpWithReversibleKeys = _interopDefault$1(pathToRegexpWithReversibleKeys$1);
var thenDenodeify = _interopDefault$1(thenDenodeify$1);
var eventemitter3 = _interopDefault$1(eventemitter3$1);
var hashBrownRouter = _interopDefault$1(hashBrownRouter$1);
var pagePathBuilder = _interopDefault$1(pagePathBuilder$1);
var isoNextTick = _interopDefault$1(browser);

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var stateStringParser = createCommonjsModule(function (module) {
	module.exports = function (stateString) {
		return stateString.split('.').reduce(function (stateNames, latestNameChunk) {
			stateNames.push(stateNames.length ? stateNames[stateNames.length - 1] + '.' + latestNameChunk : latestNameChunk);

			return stateNames;
		}, []);
	};
});

var stateState = function StateState() {
	var states = {};

	function getHierarchy(name) {
		var names = stateStringParser(name);

		return names.map(function (name) {
			if (!states[name]) {
				throw new Error('State ' + name + ' not found');
			}
			return states[name];
		});
	}

	function getParent(name) {
		var parentName = getParentName(name);

		return parentName && states[parentName];
	}

	function getParentName(name) {
		var names = stateStringParser(name);

		if (names.length > 1) {
			var secondToLast = names.length - 2;

			return names[secondToLast];
		} else {
			return null;
		}
	}

	function guaranteeAllStatesExist(newStateName) {
		var stateNames = stateStringParser(newStateName);
		var statesThatDontExist = stateNames.filter(function (name) {
			return !states[name];
		});

		if (statesThatDontExist.length > 0) {
			throw new Error('State ' + statesThatDontExist[statesThatDontExist.length - 1] + ' does not exist');
		}
	}

	function buildFullStateRoute(stateName) {
		return getHierarchy(stateName).map(function (state) {
			return '/' + (state.route || '');
		}).join('').replace(/\/{2,}/g, '/');
	}

	function applyDefaultChildStates(stateName) {
		var state = states[stateName];

		var defaultChildStateName = state && (typeof state.defaultChild === 'function' ? state.defaultChild() : state.defaultChild);

		if (!defaultChildStateName) {
			return stateName;
		}

		var fullStateName = stateName + '.' + defaultChildStateName;

		return applyDefaultChildStates(fullStateName);
	}

	return {
		add: function add(name, state) {
			states[name] = state;
		},
		get: function get$$1(name) {
			return name && states[name];
		},

		getHierarchy: getHierarchy,
		getParent: getParent,
		getParentName: getParentName,
		guaranteeAllStatesExist: guaranteeAllStatesExist,
		buildFullStateRoute: buildFullStateRoute,
		applyDefaultChildStates: applyDefaultChildStates
	};
};

var extend = function extend() {
	for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
		args[_key] = arguments[_key];
	}

	return Object.assign.apply(Object, [{}].concat(args));
};

var stateComparison_1 = function StateComparison(stateState) {
	var getPathParameters = pathParameters();

	var parametersChanged = function parametersChanged(args) {
		return parametersThatMatterWereChanged(extend(args, { stateState: stateState, getPathParameters: getPathParameters }));
	};

	return function (args) {
		return stateComparison(extend(args, { parametersChanged: parametersChanged }));
	};
};

function pathParameters() {
	var parameters = {};

	return function (path) {
		if (!path) {
			return [];
		}

		if (!parameters[path]) {
			parameters[path] = pathToRegexpWithReversibleKeys(path).keys.map(function (key) {
				return key.name;
			});
		}

		return parameters[path];
	};
}

function parametersThatMatterWereChanged(_ref) {
	var stateState = _ref.stateState,
	    getPathParameters = _ref.getPathParameters,
	    stateName = _ref.stateName,
	    fromParameters = _ref.fromParameters,
	    toParameters = _ref.toParameters;

	var state = stateState.get(stateName);
	var querystringParameters = state.querystringParameters || [];
	var parameters = getPathParameters(state.route).concat(querystringParameters);

	return Array.isArray(parameters) && parameters.some(function (key) {
		return fromParameters[key] !== toParameters[key];
	});
}

function stateComparison(_ref2) {
	var parametersChanged = _ref2.parametersChanged,
	    original = _ref2.original,
	    destination = _ref2.destination;

	var states = combineArrays({
		start: stateStringParser(original.name),
		end: stateStringParser(destination.name)
	});

	return states.map(function (_ref3) {
		var start = _ref3.start,
		    end = _ref3.end;
		return {
			nameBefore: start,
			nameAfter: end,
			stateNameChanged: start !== end,
			stateParametersChanged: start === end && parametersChanged({
				stateName: start,
				fromParameters: original.parameters,
				toParameters: destination.parameters
			})
		};
	});
}

var currentState = function CurrentState() {
	var current = {
		name: '',
		parameters: {}
	};

	return {
		get: function get$$1() {
			return current;
		},
		set: function set$$1(name, parameters) {
			current = {
				name: name,
				parameters: parameters
			};
		}
	};
};

var stateChangeLogic = function stateChangeLogic(stateComparisonResults) {
	var hitChangingState = false;
	var hitDestroyedState = false;

	var output = {
		destroy: [],
		change: [],
		create: []
	};

	stateComparisonResults.forEach(function (state) {
		hitChangingState = hitChangingState || state.stateParametersChanged;
		hitDestroyedState = hitDestroyedState || state.stateNameChanged;

		if (state.nameBefore) {
			if (hitDestroyedState) {
				output.destroy.push(state.nameBefore);
			} else if (hitChangingState) {
				output.change.push(state.nameBefore);
			}
		}

		if (state.nameAfter && hitDestroyedState) {
			output.create.push(state.nameAfter);
		}
	});

	return output;
};

var stateTransitionManager = function stateTransitionManager(emitter) {
	var currentTransitionAttempt = null;
	var nextTransition = null;

	function doneTransitioning() {
		currentTransitionAttempt = null;
		if (nextTransition) {
			beginNextTransitionAttempt();
		}
	}

	var isTransitioning = function isTransitioning() {
		return !!currentTransitionAttempt;
	};

	function beginNextTransitionAttempt() {
		currentTransitionAttempt = nextTransition;
		nextTransition = null;
		currentTransitionAttempt.beginStateChange();
	}

	function cancelCurrentTransition() {
		currentTransitionAttempt.transition.cancelled = true;
		var err = new Error('State transition cancelled by the state transition manager');
		err.wasCancelledBySomeoneElse = true;
		emitter.emit('stateChangeCancelled', err);
	}

	emitter.on('stateChangeAttempt', function (beginStateChange) {
		nextTransition = createStateTransitionAttempt(beginStateChange);

		if (isTransitioning() && currentTransitionAttempt.transition.cancellable) {
			cancelCurrentTransition();
		} else if (!isTransitioning()) {
			beginNextTransitionAttempt();
		}
	});

	emitter.on('stateChangeError', doneTransitioning);
	emitter.on('stateChangeCancelled', doneTransitioning);
	emitter.on('stateChangeEnd', doneTransitioning);

	function createStateTransitionAttempt(_beginStateChange) {
		var transition = {
			cancelled: false,
			cancellable: true
		};
		return {
			transition: transition,
			beginStateChange: function beginStateChange() {
				for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
					args[_key] = arguments[_key];
				}

				return _beginStateChange.apply(undefined, [transition].concat(args));
			}
		};
	}
};

var defaultRouterOptions = { reverse: false };

// Pulled from https://github.com/joliss/promise-map-series and prettied up a bit

var promiseMapSeries = function sequence(array, iterator) {
	var currentPromise = Promise.resolve();
	return Promise.all(array.map(function (value, i) {
		return currentPromise = currentPromise.then(function () {
			return iterator(value, i, array);
		});
	}));
};

var _typeof = typeof Symbol === "function" && _typeof$1(Symbol.iterator) === "symbol" ? function (obj) {
	return typeof obj === 'undefined' ? 'undefined' : _typeof$1(obj);
} : function (obj) {
	return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj === 'undefined' ? 'undefined' : _typeof$1(obj);
};

var getProperty = function getProperty(name) {
	return function (obj) {
		return obj[name];
	};
};
var reverse = function reverse(ary) {
	return ary.slice().reverse();
};
var isFunction = function isFunction(property) {
	return function (obj) {
		return typeof obj[property] === 'function';
	};
};
var isThenable = function isThenable(object) {
	return object && ((typeof object === 'undefined' ? 'undefined' : _typeof(object)) === 'object' || typeof object === 'function') && typeof object.then === 'function';
};
var promiseMe = function promiseMe(fn) {
	for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
		args[_key - 1] = arguments[_key];
	}

	return new Promise(function (resolve) {
		return resolve(fn.apply(undefined, args));
	});
};

var expectedPropertiesOfAddState = ['name', 'route', 'defaultChild', 'data', 'template', 'resolve', 'activate', 'querystringParameters', 'defaultQuerystringParameters', 'defaultParameters'];

var abstractStateRouter = function StateProvider(makeRenderer, rootElement) {
	var stateRouterOptions = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

	var prototypalStateHolder = stateState();
	var lastCompletelyLoadedState = currentState();
	var lastStateStartedActivating = currentState();
	var stateProviderEmitter = new eventemitter3();
	var compareStartAndEndStates = stateComparison_1(prototypalStateHolder);

	var stateNameToArrayofStates = function stateNameToArrayofStates(stateName) {
		return stateStringParser(stateName).map(prototypalStateHolder.get);
	};

	stateTransitionManager(stateProviderEmitter);

	var _extend = extend({
		throwOnError: true,
		pathPrefix: '#'
	}, stateRouterOptions),
	    throwOnError = _extend.throwOnError,
	    pathPrefix = _extend.pathPrefix;

	var router = stateRouterOptions.router || hashBrownRouter(defaultRouterOptions);

	router.on('not found', function (route, parameters) {
		stateProviderEmitter.emit('routeNotFound', route, parameters);
	});

	var destroyDom = null;
	var getDomChild = null;
	var renderDom = null;
	var resetDom = null;

	var activeStateResolveContent = {};
	var activeDomApis = {};
	var activeEmitters = {};

	function handleError(event, err) {
		isoNextTick(function () {
			stateProviderEmitter.emit(event, err);
			console.error(event + ' - ' + err.message);
			if (throwOnError) {
				throw err;
			}
		});
	}

	function destroyStateName(stateName) {
		var state = prototypalStateHolder.get(stateName);
		stateProviderEmitter.emit('beforeDestroyState', {
			state: state,
			domApi: activeDomApis[stateName]
		});

		activeEmitters[stateName].emit('destroy');
		activeEmitters[stateName].removeAllListeners();
		delete activeEmitters[stateName];
		delete activeStateResolveContent[stateName];

		return destroyDom(activeDomApis[stateName]).then(function () {
			delete activeDomApis[stateName];
			stateProviderEmitter.emit('afterDestroyState', {
				state: state
			});
		});
	}

	function resetStateName(parameters, stateName) {
		var domApi = activeDomApis[stateName];
		var content = getContentObject(activeStateResolveContent, stateName);
		var state = prototypalStateHolder.get(stateName);

		stateProviderEmitter.emit('beforeResetState', {
			domApi: domApi,
			content: content,
			state: state,
			parameters: parameters
		});

		activeEmitters[stateName].emit('destroy');
		delete activeEmitters[stateName];

		return resetDom({
			domApi: domApi,
			content: content,
			template: state.template,
			parameters: parameters
		}).then(function (newDomApi) {
			if (newDomApi) {
				activeDomApis[stateName] = newDomApi;
			}

			stateProviderEmitter.emit('afterResetState', {
				domApi: activeDomApis[stateName],
				content: content,
				state: state,
				parameters: parameters
			});
		});
	}

	function getChildElementForStateName(stateName) {
		return new Promise(function (resolve) {
			var parent = prototypalStateHolder.getParent(stateName);
			if (parent) {
				var parentDomApi = activeDomApis[parent.name];
				resolve(getDomChild(parentDomApi));
			} else {
				resolve(rootElement);
			}
		});
	}

	function renderStateName(parameters, stateName) {
		return getChildElementForStateName(stateName).then(function (element) {
			var state = prototypalStateHolder.get(stateName);
			var content = getContentObject(activeStateResolveContent, stateName);

			stateProviderEmitter.emit('beforeCreateState', {
				state: state,
				content: content,
				parameters: parameters
			});

			return renderDom({
				template: state.template,
				element: element,
				content: content,
				parameters: parameters
			}).then(function (domApi) {
				activeDomApis[stateName] = domApi;
				stateProviderEmitter.emit('afterCreateState', {
					state: state,
					domApi: domApi,
					content: content,
					parameters: parameters
				});
				return domApi;
			});
		});
	}

	function renderAll(stateNames, parameters) {
		return promiseMapSeries(stateNames, function (stateName) {
			return renderStateName(parameters, stateName);
		});
	}

	function onRouteChange(state, parameters) {
		try {
			var finalDestinationStateName = prototypalStateHolder.applyDefaultChildStates(state.name);

			if (finalDestinationStateName === state.name) {
				emitEventAndAttemptStateChange(finalDestinationStateName, parameters);
			} else {
				// There are default child states that need to be applied

				var theRouteWeNeedToEndUpAt = makePath(finalDestinationStateName, parameters);
				var currentRoute = router.location.get();

				if (theRouteWeNeedToEndUpAt === currentRoute) {
					// the child state has the same route as the current one, just start navigating there
					emitEventAndAttemptStateChange(finalDestinationStateName, parameters);
				} else {
					// change the url to match the full default child state route
					stateProviderEmitter.go(finalDestinationStateName, parameters, { replace: true });
				}
			}
		} catch (err) {
			handleError('stateError', err);
		}
	}

	function addState(state) {
		if (typeof state === 'undefined') {
			throw new Error('Expected \'state\' to be passed in.');
		} else if (typeof state.name === 'undefined') {
			throw new Error('Expected the \'name\' option to be passed in.');
		} else if (typeof state.template === 'undefined') {
			throw new Error('Expected the \'template\' option to be passed in.');
		}
		Object.keys(state).filter(function (key) {
			return expectedPropertiesOfAddState.indexOf(key) === -1;
		}).forEach(function (key) {
			console.warn('Unexpected property passed to addState:', key);
		});

		prototypalStateHolder.add(state.name, state);

		var route = prototypalStateHolder.buildFullStateRoute(state.name);

		router.add(route, function (parameters) {
			return onRouteChange(state, parameters);
		});
	}

	function getStatesToResolve(stateChanges) {
		return stateChanges.change.concat(stateChanges.create).map(prototypalStateHolder.get);
	}

	function emitEventAndAttemptStateChange(newStateName, parameters) {
		stateProviderEmitter.emit('stateChangeAttempt', function stateGo(transition) {
			attemptStateChange(newStateName, parameters, transition);
		});
	}

	function attemptStateChange(newStateName, parameters, transition) {
		function ifNotCancelled(fn) {
			return function () {
				if (transition.cancelled) {
					var err = new Error('The transition to ' + newStateName + ' was cancelled');
					err.wasCancelledBySomeoneElse = true;
					throw err;
				} else {
					return fn.apply(undefined, arguments);
				}
			};
		}

		return promiseMe(prototypalStateHolder.guaranteeAllStatesExist, newStateName).then(function applyDefaultParameters() {
			var state = prototypalStateHolder.get(newStateName);
			var defaultParams = state.defaultParameters || state.defaultQuerystringParameters || {};
			var needToApplyDefaults = Object.keys(defaultParams).some(function missingParameterValue(param) {
				return typeof parameters[param] === 'undefined';
			});

			if (needToApplyDefaults) {
				throw redirector(newStateName, extend(defaultParams, parameters));
			}
			return state;
		}).then(ifNotCancelled(function (state) {
			stateProviderEmitter.emit('stateChangeStart', state, parameters, stateNameToArrayofStates(state.name));
			lastStateStartedActivating.set(state.name, parameters);
		})).then(function getStateChanges() {
			var stateComparisonResults = compareStartAndEndStates({
				original: lastCompletelyLoadedState.get(),
				destination: {
					name: newStateName,
					parameters: parameters
				}
			});
			return stateChangeLogic(stateComparisonResults); // { destroy, change, create }
		}).then(ifNotCancelled(function resolveDestroyAndActivateStates(stateChanges) {
			return resolveStates(getStatesToResolve(stateChanges), extend(parameters)).catch(function onResolveError(e) {
				e.stateChangeError = true;
				throw e;
			}).then(ifNotCancelled(function destroyAndActivate(stateResolveResultsObject) {
				transition.cancellable = false;

				var activateAll = function activateAll() {
					return activateStates(stateChanges.change.concat(stateChanges.create));
				};

				activeStateResolveContent = extend(activeStateResolveContent, stateResolveResultsObject);

				return promiseMapSeries(reverse(stateChanges.destroy), destroyStateName).then(function () {
					return promiseMapSeries(reverse(stateChanges.change), function (stateName) {
						return resetStateName(extend(parameters), stateName);
					});
				}).then(function () {
					return renderAll(stateChanges.create, extend(parameters)).then(activateAll);
				});
			}));

			function activateStates(stateNames) {
				return stateNames.map(prototypalStateHolder.get).forEach(function (state) {
					var emitter = new eventemitter3();
					var context = Object.create(emitter);
					context.domApi = activeDomApis[state.name];
					context.data = state.data;
					context.parameters = parameters;
					context.content = getContentObject(activeStateResolveContent, state.name);
					activeEmitters[state.name] = emitter;

					try {
						state.activate && state.activate(context);
					} catch (e) {
						isoNextTick(function () {
							throw e;
						});
					}
				});
			}
		})).then(function stateChangeComplete() {
			lastCompletelyLoadedState.set(newStateName, parameters);
			try {
				stateProviderEmitter.emit('stateChangeEnd', prototypalStateHolder.get(newStateName), parameters, stateNameToArrayofStates(newStateName));
			} catch (e) {
				handleError('stateError', e);
			}
		}).catch(ifNotCancelled(function handleStateChangeError(err) {
			if (err && err.redirectTo) {
				stateProviderEmitter.emit('stateChangeCancelled', err);
				return stateProviderEmitter.go(err.redirectTo.name, err.redirectTo.params, { replace: true });
			} else if (err) {
				handleError('stateChangeError', err);
			}
		})).catch(function handleCancellation(err) {
			if (err && err.wasCancelledBySomeoneElse) {
				// we don't care, the state transition manager has already emitted the stateChangeCancelled for us
			} else {
				throw new Error('This probably shouldn\'t happen, maybe file an issue or something ' + err);
			}
		});
	}

	function makePath(stateName, parameters, options) {
		function getGuaranteedPreviousState() {
			if (!lastStateStartedActivating.get().name) {
				throw new Error('makePath required a previous state to exist, and none was found');
			}
			return lastStateStartedActivating.get();
		}
		if (options && options.inherit) {
			parameters = extend(getGuaranteedPreviousState().parameters, parameters);
		}

		var destinationStateName = stateName === null ? getGuaranteedPreviousState().name : stateName;

		var destinationState = prototypalStateHolder.get(destinationStateName) || {};
		var defaultParams = destinationState.defaultParameters || destinationState.defaultQuerystringParameters;

		parameters = extend(defaultParams, parameters);

		prototypalStateHolder.guaranteeAllStatesExist(destinationStateName);
		var route = prototypalStateHolder.buildFullStateRoute(destinationStateName);
		return pagePathBuilder(route, parameters || {});
	}

	var defaultOptions = {
		replace: false
	};

	stateProviderEmitter.addState = addState;
	stateProviderEmitter.go = function (newStateName, parameters, options) {
		options = extend(defaultOptions, options);
		var goFunction = options.replace ? router.replace : router.go;

		return promiseMe(makePath, newStateName, parameters, options).then(goFunction, function (err) {
			return handleError('stateChangeError', err);
		});
	};
	stateProviderEmitter.evaluateCurrentRoute = function (defaultState, defaultParams) {
		return promiseMe(makePath, defaultState, defaultParams).then(function (defaultPath) {
			router.evaluateCurrent(defaultPath);
		}).catch(function (err) {
			return handleError('stateError', err);
		});
	};
	stateProviderEmitter.makePath = function (stateName, parameters, options) {
		return pathPrefix + makePath(stateName, parameters, options);
	};
	stateProviderEmitter.stateIsActive = function (stateName) {
		var parameters = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

		var currentState$$1 = lastCompletelyLoadedState.get();
		var stateNameMatches = currentState$$1.name === stateName || currentState$$1.name.indexOf(stateName + '.') === 0;
		var parametersWereNotPassedIn = !parameters;

		return stateNameMatches && (parametersWereNotPassedIn || Object.keys(parameters).every(function (key) {
			return parameters[key] === currentState$$1.parameters[key];
		}));
	};

	var renderer = makeRenderer(stateProviderEmitter);

	destroyDom = thenDenodeify(renderer.destroy);
	getDomChild = thenDenodeify(renderer.getChildElement);
	renderDom = thenDenodeify(renderer.render);
	resetDom = thenDenodeify(renderer.reset);

	return stateProviderEmitter;
};

function getContentObject(stateResolveResultsObject, stateName) {
	var allPossibleResolvedStateNames = stateStringParser(stateName);

	return allPossibleResolvedStateNames.filter(function (stateName) {
		return stateResolveResultsObject[stateName];
	}).reduce(function (obj, stateName) {
		return extend(obj, stateResolveResultsObject[stateName]);
	}, {});
}

function redirector(newStateName, parameters) {
	return {
		redirectTo: {
			name: newStateName,
			params: parameters
		}
	};
}

// { [stateName]: resolveResult }
function resolveStates(states, parameters) {
	var statesWithResolveFunctions = states.filter(isFunction('resolve'));
	var stateNamesWithResolveFunctions = statesWithResolveFunctions.map(getProperty('name'));

	var resolves = Promise.all(statesWithResolveFunctions.map(function (state) {
		return new Promise(function (resolve, reject) {
			var resolveCb = function resolveCb(err, content) {
				return err ? reject(err) : resolve(content);
			};

			resolveCb.redirect = function (newStateName, parameters) {
				reject(redirector(newStateName, parameters));
			};

			var res = state.resolve(state.data, parameters, resolveCb);
			if (isThenable(res)) {
				resolve(res);
			}
		});
	}));

	return resolves.then(function (resolveResults) {
		return combineArrays({
			stateName: stateNamesWithResolveFunctions,
			resolveResult: resolveResults
		}).reduce(function (obj, result) {
			obj[result.stateName] = result.resolveResult;
			return obj;
		}, {});
	});
}

var bundle = abstractStateRouter;

var deepmerge = createCommonjsModule$1(function (module, exports) {
    (function (root, factory) {
        if (typeof undefined === 'function' && undefined.amd) {
            undefined(factory);
        } else {
            module.exports = factory();
        }
    })(commonjsGlobal, function () {

        function isMergeableObject(val) {
            var nonNullObject = val && (typeof val === 'undefined' ? 'undefined' : _typeof$1(val)) === 'object';

            return nonNullObject && Object.prototype.toString.call(val) !== '[object RegExp]' && Object.prototype.toString.call(val) !== '[object Date]';
        }

        function emptyTarget(val) {
            return Array.isArray(val) ? [] : {};
        }

        function cloneIfNecessary(value, optionsArgument) {
            var clone = optionsArgument && optionsArgument.clone === true;
            return clone && isMergeableObject(value) ? deepmerge(emptyTarget(value), value, optionsArgument) : value;
        }

        function defaultArrayMerge(target, source, optionsArgument) {
            var destination = target.slice();
            source.forEach(function (e, i) {
                if (typeof destination[i] === 'undefined') {
                    destination[i] = cloneIfNecessary(e, optionsArgument);
                } else if (isMergeableObject(e)) {
                    destination[i] = deepmerge(target[i], e, optionsArgument);
                } else if (target.indexOf(e) === -1) {
                    destination.push(cloneIfNecessary(e, optionsArgument));
                }
            });
            return destination;
        }

        function mergeObject(target, source, optionsArgument) {
            var destination = {};
            if (isMergeableObject(target)) {
                Object.keys(target).forEach(function (key) {
                    destination[key] = cloneIfNecessary(target[key], optionsArgument);
                });
            }
            Object.keys(source).forEach(function (key) {
                if (!isMergeableObject(source[key]) || !target[key]) {
                    destination[key] = cloneIfNecessary(source[key], optionsArgument);
                } else {
                    destination[key] = deepmerge(target[key], source[key], optionsArgument);
                }
            });
            return destination;
        }

        function deepmerge(target, source, optionsArgument) {
            var array = Array.isArray(source);
            var options = optionsArgument || { arrayMerge: defaultArrayMerge };
            var arrayMerge = options.arrayMerge || defaultArrayMerge;

            if (array) {
                return Array.isArray(target) ? arrayMerge(target, source, optionsArgument) : cloneIfNecessary(source, optionsArgument);
            } else {
                return mergeObject(target, source, optionsArgument);
            }
        }

        deepmerge.all = function deepmergeAll(array, optionsArgument) {
            if (!Array.isArray(array) || array.length < 2) {
                throw new Error('first argument should be an array with at least two elements');
            }

            // we are sure there are at least 2 values, so it is safe to have no initial value
            return array.reduce(function (prev, next) {
                return deepmerge(prev, next, optionsArgument);
            });
        };

        return deepmerge;
    });
});

var bundle$1 = function SvelteStateRendererFactory() {
	var defaultOptions = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	return function makeRenderer(stateRouter) {
		var asr = {
			makePath: stateRouter.makePath,
			stateIsActive: stateRouter.stateIsActive
		};

		function render(context, cb) {
			var target = context.element,
			    template = context.template,
			    content = context.content;

			var rendererSuppliedOptions = deepmerge(defaultOptions, {
				target: target,
				data: Object.assign(content, defaultOptions.data, { asr: asr })
			});

			function construct(component, options) {
				return options.methods ? instantiateWithMethods(component, options, options.methods) : new component(options);
			}

			var svelte = void 0;

			try {
				if (typeof template === 'function') {
					svelte = construct(template, rendererSuppliedOptions);
				} else {
					var options = deepmerge(rendererSuppliedOptions, template.options);

					svelte = construct(template.component, options);
				}
			} catch (e) {
				cb(e);
				return;
			}

			function onRouteChange() {
				svelte.set({
					asr: asr
				});
			}

			stateRouter.on('stateChangeEnd', onRouteChange);

			svelte.on('destroy', function () {
				stateRouter.removeListener('stateChangeEnd', onRouteChange);
			});

			svelte.mountedToTarget = target;
			cb(null, svelte);
		}

		return {
			render: render,
			reset: function reset(context, cb) {
				var svelte = context.domApi;
				var element = svelte.mountedToTarget;

				svelte.teardown();

				var renderContext = Object.assign({ element: element }, context);

				render(renderContext, cb);
			},
			destroy: function destroy(svelte, cb) {
				svelte.teardown();
				cb();
			},
			getChildElement: function getChildElement(svelte, cb) {
				try {
					var element = svelte.mountedToTarget;
					var child = element.querySelector('uiView');
					cb(null, child);
				} catch (e) {
					cb(e);
				}
			}
		};
	};
};

function instantiateWithMethods(Component, options, methods) {
	// const coolPrototype = Object.assign(Object.create(Component.prototype), methods)
	// return Component.call(coolPrototype, options)
	return Object.assign(new Component(options), methods);
}

function noop() {}

function assign(target) {
	var k,
	    source,
	    i = 1,
	    len = arguments.length;
	for (; i < len; i++) {
		source = arguments[i];
		for (k in source) {
			target[k] = source[k];
		}
	}

	return target;
}

function appendNode(node, target) {
	target.appendChild(node);
}

function insertNode(node, target, anchor) {
	target.insertBefore(node, anchor);
}

function detachNode(node) {
	node.parentNode.removeChild(node);
}

function reinsertChildren(parent, target) {
	while (parent.firstChild) {
		target.appendChild(parent.firstChild);
	}
}

function destroyEach(iterations) {
	for (var i = 0; i < iterations.length; i += 1) {
		if (iterations[i]) iterations[i].d();
	}
}

function createFragment() {
	return document.createDocumentFragment();
}

function createElement(name) {
	return document.createElement(name);
}

function createText(data) {
	return document.createTextNode(data);
}

function addListener(node, event, handler) {
	node.addEventListener(event, handler, false);
}

function removeListener(node, event, handler) {
	node.removeEventListener(event, handler, false);
}

function setAttribute(node, attribute, value) {
	node.setAttribute(attribute, value);
}

function blankObject() {
	return Object.create(null);
}

function destroy(detach) {
	this.destroy = noop;
	this.fire('destroy');
	this.set = this.get = noop;

	if (detach !== false) this._fragment.u();
	this._fragment.d();
	this._fragment = this._state = null;
}

function differs(a, b) {
	return a !== b || a && (typeof a === 'undefined' ? 'undefined' : _typeof$1(a)) === 'object' || typeof a === 'function';
}

function dispatchObservers(component, group, changed, newState, oldState) {
	for (var key in group) {
		if (!changed[key]) continue;

		var newValue = newState[key];
		var oldValue = oldState[key];

		var callbacks = group[key];
		if (!callbacks) continue;

		for (var i = 0; i < callbacks.length; i += 1) {
			var callback = callbacks[i];
			if (callback.__calling) continue;

			callback.__calling = true;
			callback.call(component, newValue, oldValue);
			callback.__calling = false;
		}
	}
}

function fire(eventName, data) {
	var handlers = eventName in this._handlers && this._handlers[eventName].slice();
	if (!handlers) return;

	for (var i = 0; i < handlers.length; i += 1) {
		handlers[i].call(this, data);
	}
}

function get$2(key) {
	return key ? this._state[key] : this._state;
}

function init(component, options) {
	component.options = options;

	component._observers = { pre: blankObject(), post: blankObject() };
	component._handlers = blankObject();
	component._root = options._root || component;
	component._bind = options._bind;
}

function observe(key, callback, options) {
	var group = options && options.defer ? this._observers.post : this._observers.pre;

	(group[key] || (group[key] = [])).push(callback);

	if (!options || options.init !== false) {
		callback.__calling = true;
		callback.call(this, this._state[key]);
		callback.__calling = false;
	}

	return {
		cancel: function cancel() {
			var index = group[key].indexOf(callback);
			if (~index) group[key].splice(index, 1);
		}
	};
}

function on(eventName, handler) {
	if (eventName === 'teardown') return this.on('destroy', handler);

	var handlers = this._handlers[eventName] || (this._handlers[eventName] = []);
	handlers.push(handler);

	return {
		cancel: function cancel() {
			var index = handlers.indexOf(handler);
			if (~index) handlers.splice(index, 1);
		}
	};
}

function set$1(newState) {
	this._set(assign({}, newState));
	if (this._root._lock) return;
	this._root._lock = true;
	callAll(this._root._beforecreate);
	callAll(this._root._oncreate);
	callAll(this._root._aftercreate);
	this._root._lock = false;
}

function _set(newState) {
	var oldState = this._state,
	    changed = {},
	    dirty = false;

	for (var key in newState) {
		if (differs(newState[key], oldState[key])) changed[key] = dirty = true;
	}
	if (!dirty) return;

	this._state = assign({}, oldState, newState);
	this._recompute(changed, this._state);
	if (this._bind) this._bind(changed, this._state);
	dispatchObservers(this, this._observers.pre, changed, this._state, oldState);
	this._fragment.p(changed, this._state);
	dispatchObservers(this, this._observers.post, changed, this._state, oldState);
}

function callAll(fns) {
	while (fns && fns.length) {
		fns.pop()();
	}
}

function _mount(target, anchor) {
	this._fragment.m(target, anchor);
}

function _unmount() {
	this._fragment.u();
}

var proto = {
	destroy: destroy,
	get: get$2,
	fire: fire,
	observe: observe,
	on: on,
	set: set$1,
	teardown: destroy,
	_recompute: noop,
	_set: _set,
	_mount: _mount,
	_unmount: _unmount
};

/* client/routes/app/App.html generated by Svelte v1.41.3 */
function create_main_fragment(state, component) {
	var div, div_1, a, a_href_value, text_2, div_2;

	return {
		c: function create() {
			div = createElement("div");
			div_1 = createElement("div");
			a = createElement("a");
			a.textContent = "Respirator 101";
			text_2 = createText("\n\t");
			div_2 = createElement("div");
			div_2.innerHTML = "<uiView></uiView>";
			this.h();
		},

		h: function hydrate() {
			div.className = "app";
			div_1.className = "header";
			a.href = a_href_value = state.asr.makePath('home');
			div_2.className = "centered-container";
		},

		m: function mount(target, anchor) {
			insertNode(div, target, anchor);
			appendNode(div_1, div);
			appendNode(a, div_1);
			appendNode(text_2, div);
			appendNode(div_2, div);
		},

		p: function update(changed, state) {
			if (changed.asr && a_href_value !== (a_href_value = state.asr.makePath('home'))) {
				a.href = a_href_value;
			}
		},

		u: function unmount() {
			detachNode(div);
		},

		d: noop
	};
}

function App(options) {
	init(this, options);
	this._state = assign({}, options.data);

	this._fragment = create_main_fragment(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);
	}
}

assign(App.prototype, proto);

var client$47$routes$47$app$47$app$46$js = (function () {
	return {
		name: 'app',
		route: '',
		template: App
	};
});

/* client/routes/home/Home.html generated by Svelte v1.41.3 */
function create_main_fragment$1(state, component) {
	var h1, text_1, h2, a, a_href_value, text_3, h2_1, text_5, ul;

	var contentIdsAndNames = state.contentIdsAndNames;

	var each_blocks = [];

	for (var i = 0; i < contentIdsAndNames.length; i += 1) {
		each_blocks[i] = create_each_block(state, contentIdsAndNames, contentIdsAndNames[i], i, component);
	}

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "This is the home page";
			text_1 = createText("\n\n");
			h2 = createElement("h2");
			a = createElement("a");
			a.textContent = "Pick your respirator!";
			text_3 = createText("\n\n");
			h2_1 = createElement("h2");
			h2_1.textContent = "Content:";
			text_5 = createText("\n");
			ul = createElement("ul");

			for (var i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}
			this.h();
		},

		h: function hydrate() {
			a.href = a_href_value = state.asr.makePath('app.respirator-picker');
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			insertNode(h2, target, anchor);
			appendNode(a, h2);
			insertNode(text_3, target, anchor);
			insertNode(h2_1, target, anchor);
			insertNode(text_5, target, anchor);
			insertNode(ul, target, anchor);

			for (var i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(ul, null);
			}
		},

		p: function update(changed, state) {
			if (changed.asr && a_href_value !== (a_href_value = state.asr.makePath('app.respirator-picker'))) {
				a.href = a_href_value;
			}

			var contentIdsAndNames = state.contentIdsAndNames;

			if (changed.asr || changed.contentIdsAndNames) {
				for (var i = 0; i < contentIdsAndNames.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].p(changed, state, contentIdsAndNames, contentIdsAndNames[i], i);
					} else {
						each_blocks[i] = create_each_block(state, contentIdsAndNames, contentIdsAndNames[i], i, component);
						each_blocks[i].c();
						each_blocks[i].m(ul, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].u();
					each_blocks[i].d();
				}
				each_blocks.length = contentIdsAndNames.length;
			}
		},

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			detachNode(h2);
			detachNode(text_3);
			detachNode(h2_1);
			detachNode(text_5);
			detachNode(ul);

			for (var i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].u();
			}
		},

		d: function destroy$$1() {
			destroyEach(each_blocks);
		}
	};
}

// (7:1) {{#each contentIdsAndNames as page}}
function create_each_block(state, contentIdsAndNames, page, page_index, component) {
	var li,
	    a,
	    a_href_value,
	    text_value = page.name,
	    text;

	return {
		c: function create() {
			li = createElement("li");
			a = createElement("a");
			text = createText(text_value);
			this.h();
		},

		h: function hydrate() {
			a.href = a_href_value = state.asr.makePath('app.content', { id: page.id });
		},

		m: function mount(target, anchor) {
			insertNode(li, target, anchor);
			appendNode(a, li);
			appendNode(text, a);
		},

		p: function update(changed, state, contentIdsAndNames, page, page_index) {
			if ((changed.asr || changed.contentIdsAndNames) && a_href_value !== (a_href_value = state.asr.makePath('app.content', { id: page.id }))) {
				a.href = a_href_value;
			}

			if (changed.contentIdsAndNames && text_value !== (text_value = page.name)) {
				text.data = text_value;
			}
		},

		u: function unmount() {
			detachNode(li);
		},

		d: noop
	};
}

function Home(options) {
	init(this, options);
	this._state = assign({}, options.data);

	this._fragment = create_main_fragment$1(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);
	}
}

assign(Home.prototype, proto);

var acronyms = "Acronyms";
var glossary = "Glossary";
var resources = "Resources";
var idToName = {
	acronyms: acronyms,
	glossary: glossary,
	resources: resources,
	"who-should-use-it": "Who Should Use It",
	"how-to-use-it": "How To Use It",
	"before-you-start": "Before You Start",
	"top-10-terms-to-know": "Top 10 Terms To Know",
	"purpose-of-respirators": "Purpose of Respirators",
	"types-of-respirators": "Types of Respirators",
	"respirator-characteristics": "Respirator Characteristics",
	"caring-for-your-respirator": "Caring For Your Respirator",
	"respirator-safety": "Respirator Safety",
	"fit-testing": "Fit-Testing",
	"employer-responsibilites": "Employer Responsibilites",
	"conversion-tables": "Conversion Tables",
	"osha-standards": "OSHA Standards",
	"1910-134-a-permissible-practice": "1910.134  (A) PERMISSIBLE PRACTICE",
	"1910-134b-definitions": "1910.134(B) DEFINITIONS",
	"1910-134c-respiratory-protection-program": "1910.134(C) RESPIRATORY PROTECTION PROGRAM",
	"1910-134d-selection-of-respirators": "1910.134(D) SELECTION OF RESPIRATORS",
	"1910-134e-medical-evaluation": "1910.134(E) MEDICAL EVALUATION",
	"1910-134f-fit-testing": "1910.134(F) FIT TESTING",
	"1910-134g-use-of-respirators": "1910.134(G) USE OF RESPIRATORS",
	"1910-134h-maintenance-and-care-of-respirators": "1910.134(H) MAINTENANCE AND CARE OF RESPIRATORS",
	"1910-134i-breathing-air-quality-and-use": "1910.134(I) BREATHING AIR QUALITY AND USE",
	"1910-134j-identification-of-filters-cartridges-and-canisters": "1910.134(J) IDENTIFICATION OF FILTERS, CARTRIDGES, AND CANISTERS",
	"1910-134k-training-and-information": "1910.134(K) TRAINING AND INFORMATION",
	"1910-134l-program-evaluation": "1910.134(L) PROGRAM EVALUATION",
	"1910-134m-recordkeeping": "1910.134(M) RECORDKEEPING",
	"1910-134n-effective-date": "1910.134(N) EFFECTIVE DATE",
	"1910-134o-appendices": "1910.134(O) APPENDICES"
};

var contentIdsAndNames = Object.keys(idToName).map(function (id) {
	return {
		id: id,
		name: idToName[id]
	};
});

var client$47$routes$47$home$47$home$46$js = (function () {
	return {
		name: 'home',
		route: 'home',
		template: Home,
		resolve: function resolve(data, params) {
			return Promise.resolve({
				contentIdsAndNames: contentIdsAndNames
			});
		}
	};
});

/* client/routes/app/content/Dynamic.html generated by Svelte v1.41.3 */
function data() {
	return {
		data: {}
	};
}

function oncreate() {
	var _this = this;

	this.observe("component", function (Component, prev) {
		if (prev) {
			_this.component.destroy();
		}
		_this.component = new Component({
			target: _this.refs.root,
			data: _this.get("data")
		});
	});
	this.observe("data", function (data) {
		return _this.component.set(data);
	});
	this.component.on("load", this.fire.bind(this, "load"));
}

function ondestroy() {
	this.component.destroy();
}

function create_main_fragment$3(state, component) {
	var div;

	return {
		c: function create() {
			div = createElement("div");
		},

		m: function mount(target, anchor) {
			insertNode(div, target, anchor);
			component.refs.root = div;
		},

		p: noop,

		u: function unmount() {
			detachNode(div);
		},

		d: function destroy$$1() {
			if (component.refs.root === div) component.refs.root = null;
		}
	};
}

function Dynamic(options) {
	init(this, options);
	this.refs = {};
	this._state = assign(data(), options.data);

	this._handlers.destroy = [ondestroy];

	var _oncreate = oncreate.bind(this);

	if (!options._root) {
		this._oncreate = [_oncreate];
	} else {
		this._root._oncreate.push(_oncreate);
	}

	this._fragment = create_main_fragment$3(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		callAll(this._oncreate);
	}
}

assign(Dynamic.prototype, proto);

/* client/routes/app/content/Content.html generated by Svelte v1.41.3 */
function create_main_fragment$2(state, component) {
	var h1, text_1, text_2, div;

	var dynamic = new Dynamic({
		_root: component._root,
		data: { component: state.component }
	});

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "Header";
			text_1 = createText("\n\n");
			dynamic._fragment.c();
			text_2 = createText("\n\n");
			div = createElement("div");
			div.innerHTML = "<strong>Footer</strong>";
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			dynamic._mount(target, anchor);
			insertNode(text_2, target, anchor);
			insertNode(div, target, anchor);
		},

		p: function update(changed, state) {
			var dynamic_changes = {};
			if (changed.component) dynamic_changes.component = state.component;
			dynamic._set(dynamic_changes);
		},

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			dynamic._unmount();
			detachNode(text_2);
			detachNode(div);
		},

		d: function destroy$$1() {
			dynamic.destroy(false);
		}
	};
}

function Content(options) {
	init(this, options);
	this._state = assign({}, options.data);

	if (!options._root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment$2(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(Content.prototype, proto);

/* client/lib/Accordion.html generated by Svelte v1.41.3 */
function data$1() {
	return {
		open: false
	};
}

function encapsulateStyles(node) {
	setAttribute(node, "svelte-4025451237", "");
}

function add_css() {
	var style = createElement("style");
	style.id = 'svelte-4025451237-style';
	style.textContent = "[svelte-4025451237].clickable,[svelte-4025451237] .clickable{cursor:pointer}[svelte-4025451237][data-open=false],[svelte-4025451237] [data-open=false]{display:none}";
	appendNode(style, document.head);
}

function create_main_fragment$5(state, component) {
	var div,
	    h2,
	    text,
	    text_2,
	    div_1,
	    slot_content_default = component._slotted.default;

	function click_handler(event) {
		var state = component.get();
		component.set({ open: !state.open });
	}

	return {
		c: function create() {
			div = createElement("div");
			h2 = createElement("h2");
			text = createText(state.title);
			text_2 = createText("\n\t");
			div_1 = createElement("div");
			this.h();
		},

		h: function hydrate() {
			encapsulateStyles(div);
			h2.className = "clickable";
			addListener(h2, "click", click_handler);
			setAttribute(div_1, "data-open", state.open);
		},

		m: function mount(target, anchor) {
			insertNode(div, target, anchor);
			appendNode(h2, div);
			appendNode(text, h2);
			appendNode(text_2, div);
			appendNode(div_1, div);

			if (slot_content_default) {
				appendNode(slot_content_default, div_1);
			}
		},

		p: function update(changed, state) {
			if (changed.title) {
				text.data = state.title;
			}

			if (changed.open) {
				setAttribute(div_1, "data-open", state.open);
			}
		},

		u: function unmount() {
			detachNode(div);

			if (slot_content_default) {
				reinsertChildren(div_1, slot_content_default);
			}
		},

		d: function destroy$$1() {
			removeListener(h2, "click", click_handler);
		}
	};
}

function Accordion(options) {
	init(this, options);
	this._state = assign(data$1(), options.data);

	this._slotted = options.slots || {};

	if (!document.getElementById("svelte-4025451237-style")) add_css();

	this.slots = {};

	this._fragment = create_main_fragment$5(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);
	}
}

assign(Accordion.prototype, proto);

/* client/data/content/1910-134-a-permissible-practice.html generated by Svelte v1.41.3 */
function create_main_fragment$4(state, component) {
	var h1, text_1, text_2, text_3, text_4;

	var accordion = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(a)(1) Controlling Hazards"
		}
	});

	var accordion_1 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(a)(2) Employer Responsibilities"
		}
	});

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "1910.134  (A) PERMISSIBLE PRACTICE";
			text_1 = createText("\n\n");
			text_2 = createText("In the control of those occupational diseases caused by breathing air contaminated with harmful dusts, fogs, fumes, mists, gases, smokes, sprays, or vapors, the primary objective shall be to prevent atmospheric contamination. This shall be accomplished as far as feasible by accepted engineering control measures (for example, enclosure or confinement of the operation, general and local ventilation, and substitution of less toxic materials). When effective engineering controls are not feasible, or while they are being instituted, appropriate respirators shall be used pursuant to this section.");
			accordion._fragment.c();
			text_3 = createText("\n\n");
			text_4 = createText("A respirator shall be provided to each employee when such equipment is necessary to protect the health of such employee. The employer shall provide the respirators which are applicable and suitable for the purpose intended. The employer shall be responsible for the establishment and maintenance of a respiratory protection program, which shall include the requirements outlined in paragraph (c) of this section. The program shall cover each employee required by this section to use a respirator.");
			accordion_1._fragment.c();
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			appendNode(text_2, accordion._slotted.default);
			accordion._mount(target, anchor);
			insertNode(text_3, target, anchor);
			appendNode(text_4, accordion_1._slotted.default);
			accordion_1._mount(target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			accordion._unmount();
			detachNode(text_3);
			accordion_1._unmount();
		},

		d: function destroy$$1() {
			accordion.destroy(false);
			accordion_1.destroy(false);
		}
	};
}

function _1910_134_a_permissible_practice(options) {
	init(this, options);
	this._state = assign({}, options.data);

	if (!options._root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment$4(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(_1910_134_a_permissible_practice.prototype, proto);

/* client/data/content/1910-134b-definitions.html generated by Svelte v1.41.3 */
function create_main_fragment$6(state, component) {
	var h1, text_1, text_2, text_3, text_4, text_5, text_6, text_7, text_8, text_9, text_10, text_11, text_12, text_13, text_14, text_15, text_16, text_17, text_18, text_19, text_20, text_21, text_22, text_23, text_24, text_25, text_26, text_27, text_28, text_29, text_30, text_31, text_32, text_33, text_34, text_35, text_36, text_37, text_38, text_39, text_40, text_41, text_42, text_43, text_44, text_45, text_46, text_47, text_48, text_49, text_50, text_51, text_52, text_53, text_54, text_55, text_56, text_57, text_58, text_59, text_60, text_61, text_62, text_63, text_64, text_65, text_66, text_67, text_68, text_69, text_70;

	var accordion = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Air-purifying respirator" }
	});

	var accordion_1 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Assigned protection factor (APF)"
		}
	});

	var accordion_2 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Atmosphere-supplying respirator" }
	});

	var accordion_3 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Canister or cartridge" }
	});

	var accordion_4 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Demand respirator" }
	});

	var accordion_5 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Emergency situation" }
	});

	var accordion_6 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Employee exposure" }
	});

	var accordion_7 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "End-of-service-life indicator (ESLI)"
		}
	});

	var accordion_8 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Escape-only respirator" }
	});

	var accordion_9 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Filter or air purifying element" }
	});

	var accordion_10 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Filtering facepiece (dust mask)" }
	});

	var accordion_11 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Fit factor" }
	});

	var accordion_12 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Fit test" }
	});

	var accordion_13 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Helmet" }
	});

	var accordion_14 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "High efficiency particulate air (HEPA)"
		}
	});

	var accordion_15 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Hood" }
	});

	var accordion_16 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Immediately dangerous to life or health (IDLH)"
		}
	});

	var accordion_17 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Interior structural firefighting"
		}
	});

	var accordion_18 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Loose-fitting facepiece" }
	});

	var accordion_19 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Maximum use concentration (MUC)" }
	});

	var accordion_20 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Negative pressure respirator (tight fitting)"
		}
	});

	var accordion_21 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Oxygen deficient atmosphere" }
	});

	var accordion_22 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Physician or other licensed health care professional (PLHCP)"
		}
	});

	var accordion_23 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Positive pressure respirator" }
	});

	var accordion_24 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Powered air-purifying respirator (PAPR)"
		}
	});

	var accordion_25 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Pressure demand respirator" }
	});

	var accordion_26 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Qualitative fit test (QLFT)" }
	});

	var accordion_27 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Quantitative fit test (QNFT)" }
	});

	var accordion_28 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Respiratory inlet covering" }
	});

	var accordion_29 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Self-contained breathing apparatus (SCBA)"
		}
	});

	var accordion_30 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Service life" }
	});

	var accordion_31 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Supplied-air respirator (SAR)" }
	});

	var accordion_32 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "This section" }
	});

	var accordion_33 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Tight-fitting facepiece" }
	});

	var accordion_34 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "User seal check" }
	});

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "1910.134(B) DEFINITIONS";
			text_1 = createText("\n\nThe following definitions are important terms used in the respiratory protection standard in this section.\n\n");
			text_2 = createText("Air-purifying respirator means a respirator with an air-purifying filter, cartridge, or canister that removes specific air contaminants by passing ambient air through the air-purifying element.");
			accordion._fragment.c();
			text_3 = createText("\n\n");
			text_4 = createText("Assigned protection factor (APF) means the workplace level of respiratory protection that a respirator or class of respirators is expected to provide to employees when the employer implements a continuing, effective respiratory protection program as specified by this section.");
			accordion_1._fragment.c();
			text_5 = createText("\n\n");
			text_6 = createText("Atmosphere-supplying respirator means a respirator that supplies the respirator user with breathing air from a source independent of the ambient atmosphere, and includes supplied-air respirators (SARs) and self-contained breathing apparatus (SCBA) units.");
			accordion_2._fragment.c();
			text_7 = createText("\n\n");
			text_8 = createText("Canister or cartridge means a container with a filter, sorbent, or catalyst, or combination of these items, which removes specific contaminants from the air passed through the container.");
			accordion_3._fragment.c();
			text_9 = createText("\n\n");
			text_10 = createText("Demand respirator means an atmosphere-supplying respirator that admits breathing air to the facepiece only when a negative pressure is created inside the facepiece by inhalation.");
			accordion_4._fragment.c();
			text_11 = createText("\n\n");
			text_12 = createText("Emergency situation means any occurrence such as, but not limited to, equipment failure, rupture of containers, or failure of control equipment that may or does result in an uncontrolled significant release of an airborne contaminant.");
			accordion_5._fragment.c();
			text_13 = createText("\n\n");
			text_14 = createText("Employee exposure means exposure to a concentration of an airborne contaminant that would occur if the employee were not using respiratory protection.");
			accordion_6._fragment.c();
			text_15 = createText("\n\n");
			text_16 = createText("End-of-service-life indicator (ESLI) means a system that warns the respirator user of the approach of the end of adequate respiratory protection, for example, that the sorbent is approaching saturation or is no longer effective.");
			accordion_7._fragment.c();
			text_17 = createText("\n\n");
			text_18 = createText("Escape-only respirator means a respirator intended to be used only for emergency exit.");
			accordion_8._fragment.c();
			text_19 = createText("\n\n");
			text_20 = createText("Filter or air purifying element means a component used in respirators to remove solid or liquid aerosols from the inspired air.");
			accordion_9._fragment.c();
			text_21 = createText("\n\n");
			text_22 = createText("Filtering facepiece (dust mask) means a negative pressure particulate respirator with a filter as an integral part of the facepiece or with the entire facepiece composed of the filtering medium.");
			accordion_10._fragment.c();
			text_23 = createText("\n\n");
			text_24 = createText("Fit factor means a quantitative estimate of the fit of a particular respirator to a specific individual, and typically estimates the ratio of the concentration of a substance in ambient air to its concentration inside the respirator when worn.");
			accordion_11._fragment.c();
			text_25 = createText("\n\n");
			text_26 = createText("Fit test means the use of a protocol to qualitatively or quantitatively evaluate the fit of a respirator on an individual. (See also Qualitative fit test QLFT and Quantitative fit test QNFT.)");
			accordion_12._fragment.c();
			text_27 = createText("\n\n");
			text_28 = createText("Helmet means a rigid respiratory inlet covering that also provides head protection against impact and penetration.");
			accordion_13._fragment.c();
			text_29 = createText("\n\n");
			text_30 = createText("High efficiency particulate air (HEPA) filter means a filter that is at least 99.97% efficient in removing monodisperse particles of 0.3 micrometers in diameter. The equivalent NIOSH 42 CFR 84 particulate filters are the N100, R100, and P100 filters.");
			accordion_14._fragment.c();
			text_31 = createText("\n\n");
			text_32 = createText("Hood means a respiratory inlet covering that completely covers the head and neck and may also cover portions of the shoulders and torso.");
			accordion_15._fragment.c();
			text_33 = createText("\n\n");
			text_34 = createText("Immediately dangerous to life or health (IDLH) means an atmosphere that poses an immediate threat to life, would cause irreversible adverse health effects, or would impair an individual's ability to escape from a dangerous atmosphere.");
			accordion_16._fragment.c();
			text_35 = createText("\n\n");
			text_36 = createText("Interior structural firefighting means the physical activity of fire suppression, rescue or both, inside of buildings or enclosed structures which are involved in a fire situation beyond the incipient stage. (See 29 CFR 1910.155)");
			accordion_17._fragment.c();
			text_37 = createText("\n\n");
			text_38 = createText("Loose-fitting facepiece means a respiratory inlet covering that is designed to form a partial seal with the face.");
			accordion_18._fragment.c();
			text_39 = createText("\n\n");
			text_40 = createText("Maximum use concentration (MUC) means the maximum atmospheric concentration of a hazardous substance from which an employee can be expected to be protected when wearing a respirator, and is determined by the assigned protection factor of the respirator or class of respirators and the exposure limit of the hazardous substance. The MUC can be determined mathematically by multiplying the assigned protection factor specified for a respirator by the required OSHA permissible exposure limit, short-term exposure limit, or ceiling limit. When no OSHA exposure limit is available for a hazardous substance, an employer must determine an MUC on the basis of relevant available information and informed professional judgment.");
			accordion_19._fragment.c();
			text_41 = createText("\n\n");
			text_42 = createText("Negative pressure respirator (tight fitting) means a respirator in which the air pressure inside the facepiece is negative during inhalation with respect to the ambient air pressure outside the respirator.");
			accordion_20._fragment.c();
			text_43 = createText("\n\n");
			text_44 = createText("Oxygen deficient atmosphere means an atmosphere with an oxygen content below 19.5% by volume.");
			accordion_21._fragment.c();
			text_45 = createText("\n\n");
			text_46 = createText("Physician or other licensed health care professional (PLHCP) means an individual whose legally permitted scope of practice (i.e., license, registration, or certification) allows him or her to independently provide, or be delegated the responsibility to provide, some or all of the health care services required by paragraph (e) of this section.");
			accordion_22._fragment.c();
			text_47 = createText("\n\n");
			text_48 = createText("Positive pressure respirator means a respirator in which the pressure inside the respiratory inlet covering exceeds the ambient air pressure outside the respirator.");
			accordion_23._fragment.c();
			text_49 = createText("\n\n");
			text_50 = createText("Powered air-purifying respirator (PAPR) means an air-purifying respirator that uses a blower to force the ambient air through air-purifying elements to the inlet covering.");
			accordion_24._fragment.c();
			text_51 = createText("\n\n");
			text_52 = createText("Pressure demand respirator means a positive pressure atmosphere-supplying respirator that admits breathing air to the facepiece when the positive pressure is reduced inside the facepiece by inhalation.");
			accordion_25._fragment.c();
			text_53 = createText("\n\n");
			text_54 = createText("Qualitative fit test (QLFT) means a pass/fail fit test to assess the adequacy of respirator fit that relies on the individual's response to the test agent.");
			accordion_26._fragment.c();
			text_55 = createText("\n\n");
			text_56 = createText("Quantitative fit test (QNFT) means an assessment of the adequacy of respirator fit by numerically measuring the amount of leakage into the respirator.");
			accordion_27._fragment.c();
			text_57 = createText("\n\n");
			text_58 = createText("Respiratory inlet covering means that portion of a respirator that forms the protective barrier between the user's respiratory tract and an air-purifying device or breathing air source, or both. It may be a facepiece, helmet, hood, suit, or a mouthpiece respirator with nose clamp.");
			accordion_28._fragment.c();
			text_59 = createText("\n\n");
			text_60 = createText("Self-contained breathing apparatus (SCBA) means an atmosphere-supplying respirator for which the breathing air source is designed to be carried by the user.");
			accordion_29._fragment.c();
			text_61 = createText("\n\n");
			text_62 = createText("Service life means the period of time that a respirator, filter or sorbent, or other respiratory equipment provides adequate protection to the wearer.");
			accordion_30._fragment.c();
			text_63 = createText("\n\n");
			text_64 = createText("Supplied-air respirator (SAR) or airline respirator means an atmosphere-supplying respirator for which the source of breathing air is not designed to be carried by the user.");
			accordion_31._fragment.c();
			text_65 = createText("\n\n");
			text_66 = createText("This section means this respiratory protection standard.");
			accordion_32._fragment.c();
			text_67 = createText("\n\n");
			text_68 = createText("Tight-fitting facepiece means a respiratory inlet covering that forms a complete seal with the face.");
			accordion_33._fragment.c();
			text_69 = createText("\n\n");
			text_70 = createText("User seal check means an action conducted by the respirator user to determine if the respirator is properly seated to the face.");
			accordion_34._fragment.c();
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			appendNode(text_2, accordion._slotted.default);
			accordion._mount(target, anchor);
			insertNode(text_3, target, anchor);
			appendNode(text_4, accordion_1._slotted.default);
			accordion_1._mount(target, anchor);
			insertNode(text_5, target, anchor);
			appendNode(text_6, accordion_2._slotted.default);
			accordion_2._mount(target, anchor);
			insertNode(text_7, target, anchor);
			appendNode(text_8, accordion_3._slotted.default);
			accordion_3._mount(target, anchor);
			insertNode(text_9, target, anchor);
			appendNode(text_10, accordion_4._slotted.default);
			accordion_4._mount(target, anchor);
			insertNode(text_11, target, anchor);
			appendNode(text_12, accordion_5._slotted.default);
			accordion_5._mount(target, anchor);
			insertNode(text_13, target, anchor);
			appendNode(text_14, accordion_6._slotted.default);
			accordion_6._mount(target, anchor);
			insertNode(text_15, target, anchor);
			appendNode(text_16, accordion_7._slotted.default);
			accordion_7._mount(target, anchor);
			insertNode(text_17, target, anchor);
			appendNode(text_18, accordion_8._slotted.default);
			accordion_8._mount(target, anchor);
			insertNode(text_19, target, anchor);
			appendNode(text_20, accordion_9._slotted.default);
			accordion_9._mount(target, anchor);
			insertNode(text_21, target, anchor);
			appendNode(text_22, accordion_10._slotted.default);
			accordion_10._mount(target, anchor);
			insertNode(text_23, target, anchor);
			appendNode(text_24, accordion_11._slotted.default);
			accordion_11._mount(target, anchor);
			insertNode(text_25, target, anchor);
			appendNode(text_26, accordion_12._slotted.default);
			accordion_12._mount(target, anchor);
			insertNode(text_27, target, anchor);
			appendNode(text_28, accordion_13._slotted.default);
			accordion_13._mount(target, anchor);
			insertNode(text_29, target, anchor);
			appendNode(text_30, accordion_14._slotted.default);
			accordion_14._mount(target, anchor);
			insertNode(text_31, target, anchor);
			appendNode(text_32, accordion_15._slotted.default);
			accordion_15._mount(target, anchor);
			insertNode(text_33, target, anchor);
			appendNode(text_34, accordion_16._slotted.default);
			accordion_16._mount(target, anchor);
			insertNode(text_35, target, anchor);
			appendNode(text_36, accordion_17._slotted.default);
			accordion_17._mount(target, anchor);
			insertNode(text_37, target, anchor);
			appendNode(text_38, accordion_18._slotted.default);
			accordion_18._mount(target, anchor);
			insertNode(text_39, target, anchor);
			appendNode(text_40, accordion_19._slotted.default);
			accordion_19._mount(target, anchor);
			insertNode(text_41, target, anchor);
			appendNode(text_42, accordion_20._slotted.default);
			accordion_20._mount(target, anchor);
			insertNode(text_43, target, anchor);
			appendNode(text_44, accordion_21._slotted.default);
			accordion_21._mount(target, anchor);
			insertNode(text_45, target, anchor);
			appendNode(text_46, accordion_22._slotted.default);
			accordion_22._mount(target, anchor);
			insertNode(text_47, target, anchor);
			appendNode(text_48, accordion_23._slotted.default);
			accordion_23._mount(target, anchor);
			insertNode(text_49, target, anchor);
			appendNode(text_50, accordion_24._slotted.default);
			accordion_24._mount(target, anchor);
			insertNode(text_51, target, anchor);
			appendNode(text_52, accordion_25._slotted.default);
			accordion_25._mount(target, anchor);
			insertNode(text_53, target, anchor);
			appendNode(text_54, accordion_26._slotted.default);
			accordion_26._mount(target, anchor);
			insertNode(text_55, target, anchor);
			appendNode(text_56, accordion_27._slotted.default);
			accordion_27._mount(target, anchor);
			insertNode(text_57, target, anchor);
			appendNode(text_58, accordion_28._slotted.default);
			accordion_28._mount(target, anchor);
			insertNode(text_59, target, anchor);
			appendNode(text_60, accordion_29._slotted.default);
			accordion_29._mount(target, anchor);
			insertNode(text_61, target, anchor);
			appendNode(text_62, accordion_30._slotted.default);
			accordion_30._mount(target, anchor);
			insertNode(text_63, target, anchor);
			appendNode(text_64, accordion_31._slotted.default);
			accordion_31._mount(target, anchor);
			insertNode(text_65, target, anchor);
			appendNode(text_66, accordion_32._slotted.default);
			accordion_32._mount(target, anchor);
			insertNode(text_67, target, anchor);
			appendNode(text_68, accordion_33._slotted.default);
			accordion_33._mount(target, anchor);
			insertNode(text_69, target, anchor);
			appendNode(text_70, accordion_34._slotted.default);
			accordion_34._mount(target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			accordion._unmount();
			detachNode(text_3);
			accordion_1._unmount();
			detachNode(text_5);
			accordion_2._unmount();
			detachNode(text_7);
			accordion_3._unmount();
			detachNode(text_9);
			accordion_4._unmount();
			detachNode(text_11);
			accordion_5._unmount();
			detachNode(text_13);
			accordion_6._unmount();
			detachNode(text_15);
			accordion_7._unmount();
			detachNode(text_17);
			accordion_8._unmount();
			detachNode(text_19);
			accordion_9._unmount();
			detachNode(text_21);
			accordion_10._unmount();
			detachNode(text_23);
			accordion_11._unmount();
			detachNode(text_25);
			accordion_12._unmount();
			detachNode(text_27);
			accordion_13._unmount();
			detachNode(text_29);
			accordion_14._unmount();
			detachNode(text_31);
			accordion_15._unmount();
			detachNode(text_33);
			accordion_16._unmount();
			detachNode(text_35);
			accordion_17._unmount();
			detachNode(text_37);
			accordion_18._unmount();
			detachNode(text_39);
			accordion_19._unmount();
			detachNode(text_41);
			accordion_20._unmount();
			detachNode(text_43);
			accordion_21._unmount();
			detachNode(text_45);
			accordion_22._unmount();
			detachNode(text_47);
			accordion_23._unmount();
			detachNode(text_49);
			accordion_24._unmount();
			detachNode(text_51);
			accordion_25._unmount();
			detachNode(text_53);
			accordion_26._unmount();
			detachNode(text_55);
			accordion_27._unmount();
			detachNode(text_57);
			accordion_28._unmount();
			detachNode(text_59);
			accordion_29._unmount();
			detachNode(text_61);
			accordion_30._unmount();
			detachNode(text_63);
			accordion_31._unmount();
			detachNode(text_65);
			accordion_32._unmount();
			detachNode(text_67);
			accordion_33._unmount();
			detachNode(text_69);
			accordion_34._unmount();
		},

		d: function destroy$$1() {
			accordion.destroy(false);
			accordion_1.destroy(false);
			accordion_2.destroy(false);
			accordion_3.destroy(false);
			accordion_4.destroy(false);
			accordion_5.destroy(false);
			accordion_6.destroy(false);
			accordion_7.destroy(false);
			accordion_8.destroy(false);
			accordion_9.destroy(false);
			accordion_10.destroy(false);
			accordion_11.destroy(false);
			accordion_12.destroy(false);
			accordion_13.destroy(false);
			accordion_14.destroy(false);
			accordion_15.destroy(false);
			accordion_16.destroy(false);
			accordion_17.destroy(false);
			accordion_18.destroy(false);
			accordion_19.destroy(false);
			accordion_20.destroy(false);
			accordion_21.destroy(false);
			accordion_22.destroy(false);
			accordion_23.destroy(false);
			accordion_24.destroy(false);
			accordion_25.destroy(false);
			accordion_26.destroy(false);
			accordion_27.destroy(false);
			accordion_28.destroy(false);
			accordion_29.destroy(false);
			accordion_30.destroy(false);
			accordion_31.destroy(false);
			accordion_32.destroy(false);
			accordion_33.destroy(false);
			accordion_34.destroy(false);
		}
	};
}

function _1910_134b_definitions(options) {
	init(this, options);
	this._state = assign({}, options.data);

	if (!options._root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment$6(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(_1910_134b_definitions.prototype, proto);

/* client/data/content/1910-134c-respiratory-protection-program.html generated by Svelte v1.41.3 */
function create_main_fragment$7(state, component) {
	var h1, text_1, text_2, strong, text_4, strong_1, text_6, strong_2, text_8, strong_3, text_10, strong_4, text_12, strong_5, text_14, strong_6, text_16, strong_7, text_18, strong_8, text_20, strong_9, text_22, strong_10, text_24, text_25, text_26, text_27, text_28;

	var accordion = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(c)(1) Program Provisions"
		}
	});

	var accordion_1 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(c)(3) Program Administrator"
		}
	});

	var accordion_2 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(c)(4) Employer Provisions"
		}
	});

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "1910.134(C) RESPIRATORY PROTECTION PROGRAM";
			text_1 = createText("\n\nThis paragraph requires the employer to develop and implement a written respiratory protection program with required worksite-specific procedures and elements for required respirator use. The program must be administered by a suitably trained program administrator. In addition, certain program elements may be required for voluntary use to prevent potential hazards associated with the use of the respirator. The Small Entity Compliance Guide contains criteria for the selection of a program administrator and a sample program that meets the requirements of this paragraph. Copies of the Small Entity Compliance Guide will be available on or about April 8, 1998 from the Occupational Safety and Health Administration's Office of Publications, Room N 3101, 200 Constitution Avenue, NW, Washington, DC, 20210 (202-219-4667).\n\n");
			text_2 = createText("In any workplace where respirators are necessary to protect the health of the employee or whenever respirators are required by the employer, the employer shall establish and implement a written respiratory protection program with worksite-specific procedures. The program shall be updated as necessary to reflect those changes in workplace conditions that affect respirator use. The employer shall include in the program the following provisions of this section, as applicable:\n");
			strong = createElement("strong");
			strong.textContent = "1910.134(c)(1)(i)";
			text_4 = createText("\nProcedures for selecting respirators for use in the workplace;\n\n");
			strong_1 = createElement("strong");
			strong_1.textContent = "1910.134(c)(1)(ii)";
			text_6 = createText("\nMedical evaluations of employees required to use respirators;\n\n");
			strong_2 = createElement("strong");
			strong_2.textContent = "1910.134(c)(1)(iii)";
			text_8 = createText("\nFit testing procedures for tight-fitting respirators;\n\n");
			strong_3 = createElement("strong");
			strong_3.textContent = "1910.134(c)(1)(iv)";
			text_10 = createText("\nProcedures for proper use of respirators in routine and reasonably foreseeable emergency situations;\n\n");
			strong_4 = createElement("strong");
			strong_4.textContent = "1910.134(c)(1)(v)";
			text_12 = createText("\nProcedures and schedules for cleaning, disinfecting, storing, inspecting, repairing, discarding, and otherwise maintaining respirators;\n\n");
			strong_5 = createElement("strong");
			strong_5.textContent = "1910.134(c)(1)(vi)";
			text_14 = createText("\nProcedures to ensure adequate air quality, quantity, and flow of breathing air for atmosphere-supplying respirators;\n\n");
			strong_6 = createElement("strong");
			strong_6.textContent = "1910.134(c)(1)(vii)";
			text_16 = createText("\nTraining of employees in the respiratory hazards to which they are potentially exposed during routine and emergency situations;\n\n");
			strong_7 = createElement("strong");
			strong_7.textContent = "1910.134(c)(1)(viii)";
			text_18 = createText("\nTraining of employees in the proper use of respirators, including putting on and removing them, any limitations on their use, and their maintenance; and\n\n");
			strong_8 = createElement("strong");
			strong_8.textContent = "1910.134(c)(1)(ix)";
			text_20 = createText("\nProcedures for regularly evaluating the effectiveness of the program.\n\n[expand title=\"1910.134(c)(2) Non-Required Respirator Use\"]\nWhere respirator use is not required:\n");
			strong_9 = createElement("strong");
			strong_9.textContent = "1910.134(c)(2)(i)";
			text_22 = createText("\nAn employer may provide respirators at the request of employees or permit employees to use their own respirators, if the employer determines that such respirator use will not in itself create a hazard. If the employer determines that any voluntary respirator use is permissible, the employer shall provide the respirator users with the information contained in Appendix D to this section (\"Information for Employees Using Respirators When Not Required Under the Standard\"); and\n\n");
			strong_10 = createElement("strong");
			strong_10.textContent = "1910.134(c)(2)(ii)";
			text_24 = createText("\nIn addition, the employer must establish and implement those elements of a written respiratory protection program necessary to ensure that any employee using a respirator voluntarily is medically able to use that respirator, and that the respirator is cleaned, stored, and maintained so that its use does not present a health hazard to the user. Exception: Employers are not required to include in a written respiratory protection program those employees whose only use of respirators involves the voluntary use of filtering facepieces (dust masks).");
			accordion._fragment.c();
			text_25 = createText("\n\n");
			text_26 = createText("The employer shall designate a program administrator who is qualified by appropriate training or experience that is commensurate with the complexity of the program to administer or oversee the respiratory protection program and conduct the required evaluations of program effectiveness.");
			accordion_1._fragment.c();
			text_27 = createText("\n\n");
			text_28 = createText("The employer shall provide respirators, training, and medical evaluations at no cost to the employee.");
			accordion_2._fragment.c();
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			appendNode(text_2, accordion._slotted.default);
			appendNode(strong, accordion._slotted.default);
			appendNode(text_4, accordion._slotted.default);
			appendNode(strong_1, accordion._slotted.default);
			appendNode(text_6, accordion._slotted.default);
			appendNode(strong_2, accordion._slotted.default);
			appendNode(text_8, accordion._slotted.default);
			appendNode(strong_3, accordion._slotted.default);
			appendNode(text_10, accordion._slotted.default);
			appendNode(strong_4, accordion._slotted.default);
			appendNode(text_12, accordion._slotted.default);
			appendNode(strong_5, accordion._slotted.default);
			appendNode(text_14, accordion._slotted.default);
			appendNode(strong_6, accordion._slotted.default);
			appendNode(text_16, accordion._slotted.default);
			appendNode(strong_7, accordion._slotted.default);
			appendNode(text_18, accordion._slotted.default);
			appendNode(strong_8, accordion._slotted.default);
			appendNode(text_20, accordion._slotted.default);
			appendNode(strong_9, accordion._slotted.default);
			appendNode(text_22, accordion._slotted.default);
			appendNode(strong_10, accordion._slotted.default);
			appendNode(text_24, accordion._slotted.default);
			accordion._mount(target, anchor);
			insertNode(text_25, target, anchor);
			appendNode(text_26, accordion_1._slotted.default);
			accordion_1._mount(target, anchor);
			insertNode(text_27, target, anchor);
			appendNode(text_28, accordion_2._slotted.default);
			accordion_2._mount(target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			accordion._unmount();
			detachNode(text_25);
			accordion_1._unmount();
			detachNode(text_27);
			accordion_2._unmount();
		},

		d: function destroy$$1() {
			accordion.destroy(false);
			accordion_1.destroy(false);
			accordion_2.destroy(false);
		}
	};
}

function _1910_134c_respiratory_protection_program(options) {
	init(this, options);
	this._state = assign({}, options.data);

	if (!options._root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment$7(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(_1910_134c_respiratory_protection_program.prototype, proto);

/* client/data/content/1910-134d-selection-of-respirators.html generated by Svelte v1.41.3 */
function create_main_fragment$8(state, component) {
	var h1, text_1, strong, text_3, strong_1, text_5, strong_2, text_7, strong_3, text_9, text_10, strong_4, text_12, strong_5, text_14, strong_6, text_16, strong_7, text_18, strong_8, text_20, text_21, strong_9, text_23, strong_10, text_25, strong_11, text_27, strong_12, text_29, strong_13, text_31, strong_14, text_33, strong_15, text_35, strong_16, text_37, strong_17, text_39, strong_18, text_41, strong_19, text_43, strong_20, text_45, strong_21, text_47, strong_22, text_49, strong_23, text_51, strong_24, text_53, strong_25, text_55;

	var accordion = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(d)(1) General Requirements"
		}
	});

	var accordion_1 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(d)(2) Respirators for IDLH Atmospheres"
		}
	});

	var accordion_2 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(d)(3) Respirators for non-IDLH Atmospheres"
		}
	});

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "1910.134(D) SELECTION OF RESPIRATORS";
			text_1 = createText("\n\nThis paragraph requires the employer to evaluate respiratory hazard(s) in the workplace, identify relevant workplace and user factors, and base respirator selection on these factors. The paragraph also specifies appropriately protective respirators for use in IDLH atmospheres, and limits the selection and use of air-purifying respirators.\n");
			strong = createElement("strong");
			strong.textContent = "1910.134(d)(1)(i)";
			text_3 = createText("\nThe employer shall select and provide an appropriate respirator based on the respiratory hazard(s) to which the worker is exposed and workplace and user factors that affect respirator performance and reliability.\n\n");
			strong_1 = createElement("strong");
			strong_1.textContent = "1910.134(d)(1)(ii)";
			text_5 = createText("\nThe employer shall select a NIOSH-certified respirator. The respirator shall be used in compliance with the conditions of its certification.\n\n");
			strong_2 = createElement("strong");
			strong_2.textContent = "1910.134(d)(1)(iii)";
			text_7 = createText("\nThe employer shall identify and evaluate the respiratory hazard(s) in the workplace; this evaluation shall include a reasonable estimate of employee exposures to respiratory hazard(s) and an identification of the contaminant's chemical state and physical form. Where the employer cannot identify or reasonably estimate the employee exposure, the employer shall consider the atmosphere to be IDLH.\n\n");
			strong_3 = createElement("strong");
			strong_3.textContent = "1910.134(d)(1)(iv)";
			text_9 = createText("\nThe employer shall select respirators from a sufficient number of respirator models and sizes so that the respirator is acceptable to, and correctly fits, the user.");
			accordion._fragment.c();
			text_10 = createText("\n");
			strong_4 = createElement("strong");
			strong_4.textContent = "1910.134(d)(2)(i)";
			text_12 = createText("\nThe employer shall provide the following respirators for employee use in IDLH atmospheres:\n\n");
			strong_5 = createElement("strong");
			strong_5.textContent = "1910.134(d)(2)(i)(A)";
			text_14 = createText("\nA full facepiece pressure demand SCBA certified by NIOSH for a minimum service life of thirty minutes, or\n\n");
			strong_6 = createElement("strong");
			strong_6.textContent = "1910.134(d)(2)(i)(B)";
			text_16 = createText("\nA combination full facepiece pressure demand supplied-air respirator (SAR) with auxiliary self-contained air supply.\n\n");
			strong_7 = createElement("strong");
			strong_7.textContent = "1910.134(d)(2)(ii)";
			text_18 = createText("\nRespirators provided only for escape from IDLH atmospheres shall be NIOSH-certified for escape from the atmosphere in which they will be used.\n\n");
			strong_8 = createElement("strong");
			strong_8.textContent = "1910.134(d)(2)(iii)";
			text_20 = createText("\nAll oxygen-deficient atmospheres shall be considered IDLH. Exception: If the employer demonstrates that, under all foreseeable conditions, the oxygen concentration can be maintained within the ranges specified in Table II of this section (i.e., for the altitudes set out in the table), then any atmosphere-supplying respirator may be used.");
			accordion_1._fragment.c();
			text_21 = createText("\n\n");
			strong_9 = createElement("strong");
			strong_9.textContent = "1910.134(d)(3)(i)";
			text_23 = createText("\nThe employer shall provide a respirator that is adequate to protect the health of the employee and ensure compliance with all other OSHA statutory and regulatory requirements, under routine and reasonably foreseeable emergency situations.\n\n");
			strong_10 = createElement("strong");
			strong_10.textContent = "1910.134(d)(3)(i)(A)";
			text_25 = createText("\nAssigned Protection Factors (APFs) Employers must use the assigned protection factors listed in Table 1 to select a respirator that meets or exceeds the required level of employee protection. When using a combination respirator (e.g., airline respirators with an air-purifying filter), employers must ensure that the assigned protection factor is appropriate to the mode of operation in which the respirator is being used.\n\n[table id=1 /]\n\n");
			strong_11 = createElement("strong");
			strong_11.textContent = "Notes:";
			text_27 = createText("\n[1]Employers may select respirators assigned for use in higher workplace concentrations of a hazardous substance for use at lower concentrations of that substance, or when required respirator use is independent of concentration.\n[2]The assigned protection factors in Table 1 are only effective when the employer implements a continuing, effective respirator program as required by this section (29 CFR 1910.134), including training, fit testing, maintenance, and use requirements.\n[3]This APF category includes filtering facepieces, and half masks with elastomeric facepieces.\n[4]The employer must have evidence provided by the respirator manufacturer that testing of these respirators demonstrates performance at a level of protection of 1,000 or greater to receive an APF of 1,000. This level of performance can best be demonstrated by performing a WPF or SWPF study or equivalent testing. Absent such testing, all other PAPRs and SARs with helmets/hoods are to be treated as loose-fitting facepiece respirators, and receive an APF of 25.\n[5]These APFs do not apply to respirators used solely for escape. For escape respirators used in association with specific substances covered by 29 CFR 1910 subpart Z, employers must refer to the appropriate substance-specific standards in that subpart. Escape respirators for other IDLH atmospheres are specified by 29 CFR 1910.134 (d)(2)(ii).\n\n");
			strong_12 = createElement("strong");
			strong_12.textContent = "1910.134(d)(3)(i)(B)";
			text_29 = createText("\nMaximum Use Concentration (MUC)\n\n");
			strong_13 = createElement("strong");
			strong_13.textContent = "1910.134(d)(3)(i)(B)(1)";
			text_31 = createText("\nThe employer must select a respirator for employee use that maintains the employee's exposure to the hazardous substance, when measured outside the respirator, at or below the MUC.\n\n");
			strong_14 = createElement("strong");
			strong_14.textContent = "1910.134(d)(3)(i)(B)(2)";
			text_33 = createText("\nEmployers must not apply MUCs to conditions that are immediately dangerous to life or health (IDLH); instead, they must use respirators listed for IDLH conditions in paragraph (d)(2) of this standard.\n\n");
			strong_15 = createElement("strong");
			strong_15.textContent = "1910.134(d)(3)(i)(B)(3)";
			text_35 = createText("\nWhen the calculated MUC exceeds the IDLH level for a hazardous substance, or the performance limits of the cartridge or canister, then employers must set the maximum MUC at that lower limit.\n\n");
			strong_16 = createElement("strong");
			strong_16.textContent = "1910.134(d)(3)(ii)";
			text_37 = createText("\nThe respirator selected shall be appropriate for the chemical state and physical form of the contaminant.\n\n");
			strong_17 = createElement("strong");
			strong_17.textContent = "1910.134(d)(3)(iii)";
			text_39 = createText("\nFor protection against gases and vapors, the employer shall provide:\n\n");
			strong_18 = createElement("strong");
			strong_18.textContent = "1910.134(d)(3)(iii)(A)";
			text_41 = createText("\nAn atmosphere-supplying respirator, or\n\n");
			strong_19 = createElement("strong");
			strong_19.textContent = "1910.134(d)(3)(iii)(B)";
			text_43 = createText("\nAn air-purifying respirator, provided that:\n\n");
			strong_20 = createElement("strong");
			strong_20.textContent = "1910.134(d)(3)(iii)(B)(1)";
			text_45 = createText("\nThe respirator is equipped with an end-of-service-life indicator (ESLI) certified by NIOSH for the contaminant; or\n\n");
			strong_21 = createElement("strong");
			strong_21.textContent = "1910.134(d)(3)(iii)(B)(2)";
			text_47 = createText("\nIf there is no ESLI appropriate for conditions in the employer's workplace, the employer implements a change schedule for canisters and cartridges that is based on objective information or data that will ensure that canisters and cartridges are changed before the end of their service life. The employer shall describe in the respirator program the information and data relied upon and the basis for the canister and cartridge change schedule and the basis for reliance on the data.\n\n");
			strong_22 = createElement("strong");
			strong_22.textContent = "1910.134(d)(3)(iv)";
			text_49 = createText("\nFor protection against particulates, the employer shall provide:\n\n");
			strong_23 = createElement("strong");
			strong_23.textContent = "1910.134(d)(3)(iv)(A)";
			text_51 = createText("\nAn atmosphere-supplying respirator; or\n\n");
			strong_24 = createElement("strong");
			strong_24.textContent = "1910.134(d)(3)(iv)(B)";
			text_53 = createText("\nAn air-purifying respirator equipped with a filter certified by NIOSH under 30 CFR part 11 as a high efficiency particulate air (HEPA) filter, or an air-purifying respirator equipped with a filter certified for particulates by NIOSH under 42 CFR part 84; or\n\n");
			strong_25 = createElement("strong");
			strong_25.textContent = "1910.134(d)(3)(iv)(C)";
			text_55 = createText("\nFor contaminants consisting primarily of particles with mass median aerodynamic diameters (MMAD) of at least 2 micrometers, an air-purifying respirator equipped with any filter certified for particulates by NIOSH.\n\nTABLE I. -- ASSIGNED PROTECTION FACTORS\n[RESERVED]\n\n[table id=2 /]\n\n[1]Above 8,000 feet the exception does not apply. Oxygen-\nenriched breathing air must be supplied above 14,000 feet.");
			accordion_2._fragment.c();
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			appendNode(strong, accordion._slotted.default);
			appendNode(text_3, accordion._slotted.default);
			appendNode(strong_1, accordion._slotted.default);
			appendNode(text_5, accordion._slotted.default);
			appendNode(strong_2, accordion._slotted.default);
			appendNode(text_7, accordion._slotted.default);
			appendNode(strong_3, accordion._slotted.default);
			appendNode(text_9, accordion._slotted.default);
			accordion._mount(target, anchor);
			insertNode(text_10, target, anchor);
			appendNode(strong_4, accordion_1._slotted.default);
			appendNode(text_12, accordion_1._slotted.default);
			appendNode(strong_5, accordion_1._slotted.default);
			appendNode(text_14, accordion_1._slotted.default);
			appendNode(strong_6, accordion_1._slotted.default);
			appendNode(text_16, accordion_1._slotted.default);
			appendNode(strong_7, accordion_1._slotted.default);
			appendNode(text_18, accordion_1._slotted.default);
			appendNode(strong_8, accordion_1._slotted.default);
			appendNode(text_20, accordion_1._slotted.default);
			accordion_1._mount(target, anchor);
			insertNode(text_21, target, anchor);
			appendNode(strong_9, accordion_2._slotted.default);
			appendNode(text_23, accordion_2._slotted.default);
			appendNode(strong_10, accordion_2._slotted.default);
			appendNode(text_25, accordion_2._slotted.default);
			appendNode(strong_11, accordion_2._slotted.default);
			appendNode(text_27, accordion_2._slotted.default);
			appendNode(strong_12, accordion_2._slotted.default);
			appendNode(text_29, accordion_2._slotted.default);
			appendNode(strong_13, accordion_2._slotted.default);
			appendNode(text_31, accordion_2._slotted.default);
			appendNode(strong_14, accordion_2._slotted.default);
			appendNode(text_33, accordion_2._slotted.default);
			appendNode(strong_15, accordion_2._slotted.default);
			appendNode(text_35, accordion_2._slotted.default);
			appendNode(strong_16, accordion_2._slotted.default);
			appendNode(text_37, accordion_2._slotted.default);
			appendNode(strong_17, accordion_2._slotted.default);
			appendNode(text_39, accordion_2._slotted.default);
			appendNode(strong_18, accordion_2._slotted.default);
			appendNode(text_41, accordion_2._slotted.default);
			appendNode(strong_19, accordion_2._slotted.default);
			appendNode(text_43, accordion_2._slotted.default);
			appendNode(strong_20, accordion_2._slotted.default);
			appendNode(text_45, accordion_2._slotted.default);
			appendNode(strong_21, accordion_2._slotted.default);
			appendNode(text_47, accordion_2._slotted.default);
			appendNode(strong_22, accordion_2._slotted.default);
			appendNode(text_49, accordion_2._slotted.default);
			appendNode(strong_23, accordion_2._slotted.default);
			appendNode(text_51, accordion_2._slotted.default);
			appendNode(strong_24, accordion_2._slotted.default);
			appendNode(text_53, accordion_2._slotted.default);
			appendNode(strong_25, accordion_2._slotted.default);
			appendNode(text_55, accordion_2._slotted.default);
			accordion_2._mount(target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			accordion._unmount();
			detachNode(text_10);
			accordion_1._unmount();
			detachNode(text_21);
			accordion_2._unmount();
		},

		d: function destroy$$1() {
			accordion.destroy(false);
			accordion_1.destroy(false);
			accordion_2.destroy(false);
		}
	};
}

function _1910_134d_selection_of_respirators(options) {
	init(this, options);
	this._state = assign({}, options.data);

	if (!options._root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment$8(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(_1910_134d_selection_of_respirators.prototype, proto);

/* client/data/content/1910-134e-medical-evaluation.html generated by Svelte v1.41.3 */
function create_main_fragment$9(state, component) {
	var h1, text_1, text_2, text_3, strong, text_5, strong_1, text_7, text_8, strong_2, text_10, strong_3, text_12, text_13, strong_4, text_15, strong_5, text_17, text_18, strong_6, text_20, strong_7, text_22, strong_8, text_24, strong_9, text_26, strong_10, text_28, strong_11, text_30, strong_12, text_32, strong_13, text_34, text_35, text_36, strong_14, text_38, strong_15, text_40, strong_16, text_42, strong_17, text_44, strong_18, text_46, text_47, text_48, strong_19, text_50, strong_20, text_52, strong_21, text_54, strong_22, text_56;

	var accordion = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "1910.134(e)(1) General" }
	});

	var accordion_1 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(e)(2) Medical Evaluation Procedures"
		}
	});

	var accordion_2 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(e)(3) Follow-up Medical Examination"
		}
	});

	var accordion_3 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(e)(4) Admin. of Medical Questionnaire and Examinations"
		}
	});

	var accordion_4 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(e)(5) Supplemental Information for the PLHCP"
		}
	});

	var accordion_5 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(e)(6) Medical Determination"
		}
	});

	var accordion_6 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(e)(7) Additional Medical Evaluations"
		}
	});

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "1910.134(E) MEDICAL EVALUATION";
			text_1 = createText("\n\nUsing a respirator may place a physiological burden on employees that varies with the type of respirator worn, the job and workplace conditions in which the respirator is used, and the medical status of the employee. Accordingly, this paragraph specifies the minimum requirements for medical evaluation that employers must implement to determine the employee's ability to use a respirator.\n\n");
			text_2 = createText("The employer shall provide a medical evaluation to determine the employee's ability to use a respirator, before the employee is fit tested or required to use the respirator in the workplace. The employer may discontinue an employee's medical evaluations when the employee is no longer required to use a respirator.");
			accordion._fragment.c();
			text_3 = createText("\n\n");
			strong = createElement("strong");
			strong.textContent = "1910.134(e)(2)(i)";
			text_5 = createText("\nThe employer shall identify a physician or other licensed health care professional (PLHCP) to perform medical evaluations using a medical questionnaire or an initial medical examination that obtains the same information as the medical questionnaire.\n\n");
			strong_1 = createElement("strong");
			strong_1.textContent = "1910.134(e)(2)(ii)";
			text_7 = createText("\nThe medical evaluation shall obtain the information requested by the questionnaire in Sections 1 and 2, Part A of Appendix C of this section.");
			accordion_1._fragment.c();
			text_8 = createText("\n\n");
			strong_2 = createElement("strong");
			strong_2.textContent = "1910.134(e)(3)(i)";
			text_10 = createText("\nThe employer shall ensure that a follow-up medical examination is provided for an employee who gives a positive response to any question among questions 1 through 8 in Section 2, Part A of Appendix C or whose initial medical examination demonstrates the need for a follow-up medical examination.\n\n");
			strong_3 = createElement("strong");
			strong_3.textContent = "1910.134(e)(3)(ii)";
			text_12 = createText("\nThe follow-up medical examination shall include any medical tests, consultations, or diagnostic procedures that the PLHCP deems necessary to make a final determination.");
			accordion_2._fragment.c();
			text_13 = createText("\n\n");
			strong_4 = createElement("strong");
			strong_4.textContent = "1910.134(e)(4)(i)";
			text_15 = createText("\nThe medical questionnaire and examinations shall be administered confidentially during the employee's normal working hours or at a time and place convenient to the employee. The medical questionnaire shall be administered in a manner that ensures that the employee understands its content.\n\n");
			strong_5 = createElement("strong");
			strong_5.textContent = "1910.134(e)(4)(ii)";
			text_17 = createText("\nThe employer shall provide the employee with an opportunity to discuss the questionnaire and examination results with the PLHCP.");
			accordion_3._fragment.c();
			text_18 = createText("\n\n");
			strong_6 = createElement("strong");
			strong_6.textContent = "1910.134(e)(5)(i)";
			text_20 = createText("\nThe following information must be provided to the PLHCP before the PLHCP makes a recommendation concerning an employee's ability to use a respirator:\n\n");
			strong_7 = createElement("strong");
			strong_7.textContent = "1910.134(e)(5)(i)(A)";
			text_22 = createText("\n(A) The type and weight of the respirator to be used by the employee;\n\n");
			strong_8 = createElement("strong");
			strong_8.textContent = "1910.134(e)(5)(i)(B)";
			text_24 = createText("\nThe duration and frequency of respirator use (including use for rescue and escape);\n\n");
			strong_9 = createElement("strong");
			strong_9.textContent = "1910.134(e)(5)(i)(C)";
			text_26 = createText("\nThe expected physical work effort;\n\n");
			strong_10 = createElement("strong");
			strong_10.textContent = "1910.134(e)(5)(i)(D)";
			text_28 = createText("\nAdditional protective clothing and equipment to be worn; and\n\n");
			strong_11 = createElement("strong");
			strong_11.textContent = "1910.134(e)(5)(i)(E)";
			text_30 = createText("\nTemperature and humidity extremes that may be encountered.\n\n");
			strong_12 = createElement("strong");
			strong_12.textContent = "1910.134(e)(5)(ii)";
			text_32 = createText("\nAny supplemental information provided previously to the PLHCP regarding an employee need not be provided for a subsequent medical evaluation if the information and the PLHCP remain the same.\n\n");
			strong_13 = createElement("strong");
			strong_13.textContent = "1910.134(e)(5)(iii)";
			text_34 = createText("\nThe employer shall provide the PLHCP with a copy of the written respiratory protection program and a copy of this section.\n\nNote to Paragraph (e)(5)(iii): When the employer replaces a PLHCP, the employer must ensure that the new PLHCP obtains this information, either by providing the documents directly to the PLHCP or having the documents transferred from the former PLHCP to the new PLHCP. However, OSHA does not expect employers to have employees medically reevaluated solely because a new PLHCP has been selected.");
			accordion_4._fragment.c();
			text_35 = createText("\n\n");
			text_36 = createText("In determining the employee's ability to use a respirator, the employer shall:\n\n");
			strong_14 = createElement("strong");
			strong_14.textContent = "1910.134(e)(6)(i)";
			text_38 = createText("\nObtain a written recommendation regarding the employee's ability to use the respirator from the PLHCP. The recommendation shall provide only the following information:\n\n");
			strong_15 = createElement("strong");
			strong_15.textContent = "1910.134(e)(6)(i)(A)";
			text_40 = createText("\nAny limitations on respirator use related to the medical condition of the employee, or relating to the workplace conditions in which the respirator will be used, including whether or not the employee is medically able to use the respirator;\n\n");
			strong_16 = createElement("strong");
			strong_16.textContent = "1910.134(e)(6)(i)(B)";
			text_42 = createText("\nThe need, if any, for follow-up medical evaluations; and\n\n");
			strong_17 = createElement("strong");
			strong_17.textContent = "1910.134(e)(6)(i)(C)";
			text_44 = createText("\nA statement that the PLHCP has provided the employee with a copy of the PLHCP's written recommendation.\n\n");
			strong_18 = createElement("strong");
			strong_18.textContent = "1910.134(e)(6)(ii)";
			text_46 = createText("\nIf the respirator is a negative pressure respirator and the PLHCP finds a medical condition that may place the employee's health at increased risk if the respirator is used, the employer shall provide a PAPR if the PLHCP's medical evaluation finds that the employee can use such a respirator; if a subsequent medical evaluation finds that the employee is medically able to use a negative pressure respirator, then the employer is no longer required to provide a PAPR.");
			accordion_5._fragment.c();
			text_47 = createText("\n\n");
			text_48 = createText("At a minimum, the employer shall provide additional medical evaluations that comply with the requirements of this section if:\n\n");
			strong_19 = createElement("strong");
			strong_19.textContent = "1910.134(e)(7)(i)";
			text_50 = createText("\nAn employee reports medical signs or symptoms that are related to ability to use a respirator;\n\n");
			strong_20 = createElement("strong");
			strong_20.textContent = "1910.134(e)(7)(ii)";
			text_52 = createText("\nA PLHCP, supervisor, or the respirator program administrator informs the employer that an employee needs to be reevaluated;\n\n");
			strong_21 = createElement("strong");
			strong_21.textContent = "1910.134(e)(7)(iii)";
			text_54 = createText("\nInformation from the respiratory protection program, including observations made during fit testing and program evaluation, indicates a need for employee reevaluation; or\n\n");
			strong_22 = createElement("strong");
			strong_22.textContent = "1910.134(e)(7)(iv)";
			text_56 = createText("\nA change occurs in workplace conditions (e.g., physical work effort, protective clothing, temperature) that may result in a substantial increase in the physiological burden placed on an employee.");
			accordion_6._fragment.c();
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			appendNode(text_2, accordion._slotted.default);
			accordion._mount(target, anchor);
			insertNode(text_3, target, anchor);
			appendNode(strong, accordion_1._slotted.default);
			appendNode(text_5, accordion_1._slotted.default);
			appendNode(strong_1, accordion_1._slotted.default);
			appendNode(text_7, accordion_1._slotted.default);
			accordion_1._mount(target, anchor);
			insertNode(text_8, target, anchor);
			appendNode(strong_2, accordion_2._slotted.default);
			appendNode(text_10, accordion_2._slotted.default);
			appendNode(strong_3, accordion_2._slotted.default);
			appendNode(text_12, accordion_2._slotted.default);
			accordion_2._mount(target, anchor);
			insertNode(text_13, target, anchor);
			appendNode(strong_4, accordion_3._slotted.default);
			appendNode(text_15, accordion_3._slotted.default);
			appendNode(strong_5, accordion_3._slotted.default);
			appendNode(text_17, accordion_3._slotted.default);
			accordion_3._mount(target, anchor);
			insertNode(text_18, target, anchor);
			appendNode(strong_6, accordion_4._slotted.default);
			appendNode(text_20, accordion_4._slotted.default);
			appendNode(strong_7, accordion_4._slotted.default);
			appendNode(text_22, accordion_4._slotted.default);
			appendNode(strong_8, accordion_4._slotted.default);
			appendNode(text_24, accordion_4._slotted.default);
			appendNode(strong_9, accordion_4._slotted.default);
			appendNode(text_26, accordion_4._slotted.default);
			appendNode(strong_10, accordion_4._slotted.default);
			appendNode(text_28, accordion_4._slotted.default);
			appendNode(strong_11, accordion_4._slotted.default);
			appendNode(text_30, accordion_4._slotted.default);
			appendNode(strong_12, accordion_4._slotted.default);
			appendNode(text_32, accordion_4._slotted.default);
			appendNode(strong_13, accordion_4._slotted.default);
			appendNode(text_34, accordion_4._slotted.default);
			accordion_4._mount(target, anchor);
			insertNode(text_35, target, anchor);
			appendNode(text_36, accordion_5._slotted.default);
			appendNode(strong_14, accordion_5._slotted.default);
			appendNode(text_38, accordion_5._slotted.default);
			appendNode(strong_15, accordion_5._slotted.default);
			appendNode(text_40, accordion_5._slotted.default);
			appendNode(strong_16, accordion_5._slotted.default);
			appendNode(text_42, accordion_5._slotted.default);
			appendNode(strong_17, accordion_5._slotted.default);
			appendNode(text_44, accordion_5._slotted.default);
			appendNode(strong_18, accordion_5._slotted.default);
			appendNode(text_46, accordion_5._slotted.default);
			accordion_5._mount(target, anchor);
			insertNode(text_47, target, anchor);
			appendNode(text_48, accordion_6._slotted.default);
			appendNode(strong_19, accordion_6._slotted.default);
			appendNode(text_50, accordion_6._slotted.default);
			appendNode(strong_20, accordion_6._slotted.default);
			appendNode(text_52, accordion_6._slotted.default);
			appendNode(strong_21, accordion_6._slotted.default);
			appendNode(text_54, accordion_6._slotted.default);
			appendNode(strong_22, accordion_6._slotted.default);
			appendNode(text_56, accordion_6._slotted.default);
			accordion_6._mount(target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			accordion._unmount();
			detachNode(text_3);
			accordion_1._unmount();
			detachNode(text_8);
			accordion_2._unmount();
			detachNode(text_13);
			accordion_3._unmount();
			detachNode(text_18);
			accordion_4._unmount();
			detachNode(text_35);
			accordion_5._unmount();
			detachNode(text_47);
			accordion_6._unmount();
		},

		d: function destroy$$1() {
			accordion.destroy(false);
			accordion_1.destroy(false);
			accordion_2.destroy(false);
			accordion_3.destroy(false);
			accordion_4.destroy(false);
			accordion_5.destroy(false);
			accordion_6.destroy(false);
		}
	};
}

function _1910_134e_medical_evaluation(options) {
	init(this, options);
	this._state = assign({}, options.data);

	if (!options._root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment$9(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(_1910_134e_medical_evaluation.prototype, proto);

/* client/data/content/1910-134f-fit-testing.html generated by Svelte v1.41.3 */
function create_main_fragment$10(state, component) {
	var h1, text_1, text_2, text_3, text_4, text_5, text_6, text_7, text_8, text_9, text_10, text_11, text_12, text_13, text_14, text_15, text_16, strong, text_18, strong_1, text_20, strong_2, text_22;

	var accordion = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "1910.134(f)(1) Fit Test Passed" }
	});

	var accordion_1 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "1910.134(f)(2) When to Fit Test" }
	});

	var accordion_2 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(f)(3) Additional Fit Tests"
		}
	});

	var accordion_3 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(f)(4) Selecting a Different Respirator"
		}
	});

	var accordion_4 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(f)(5) Fit Test Protocols"
		}
	});

	var accordion_5 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "1910.134(f)(6) QLFT" }
	});

	var accordion_6 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "1910.134(f)(7) QNFT" }
	});

	var accordion_7 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(f)(8) Negative Pressure Mode"
		}
	});

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "1910.134(F) FIT TESTING";
			text_1 = createText("\n\nThis paragraph requires that, before an employee may be required to use any respirator with a negative or positive pressure tight-fitting facepiece, the employee must be fit tested with the same make, model, style, and size of respirator that will be used. This paragraph specifies the kinds of fit tests allowed, the procedures for conducting them, and how the results of the fit tests must be used.\n\n");
			text_2 = createText("The employer shall ensure that employees using a tight-fitting facepiece respirator pass an appropriate qualitative fit test (QLFT) or quantitative fit test (QNFT) as stated in this paragraph.");
			accordion._fragment.c();
			text_3 = createText("\n\n");
			text_4 = createText("The employer shall ensure that an employee using a tight-fitting facepiece respirator is fit tested prior to initial use of the respirator, whenever a different respirator facepiece (size, style, model or make) is used, and at least annually thereafter.");
			accordion_1._fragment.c();
			text_5 = createText("\n\n");
			text_6 = createText("The employer shall conduct an additional fit test whenever the employee reports, or the employer, PLHCP, supervisor, or program administrator makes visual observations of, changes in the employee's physical condition that could affect respirator fit. Such conditions include, but are not limited to, facial scarring, dental changes, cosmetic surgery, or an obvious change in body weight.");
			accordion_2._fragment.c();
			text_7 = createText("\n\n");
			text_8 = createText("If after passing a QLFT or QNFT, the employee subsequently notifies the employer, program administrator, supervisor, or PLHCP that the fit of the respirator is unacceptable, the employee shall be given a reasonable opportunity to select a different respirator facepiece and to be retested.");
			accordion_3._fragment.c();
			text_9 = createText("\n\n");
			text_10 = createText("The fit test shall be administered using an OSHA-accepted QLFT or QNFT protocol. The OSHA-accepted QLFT and QNFT protocols and procedures are contained in Appendix A of this section.");
			accordion_4._fragment.c();
			text_11 = createText("\n");
			text_12 = createText("QLFT may only be used to fit test negative pressure air-purifying respirators that must achieve a fit factor of 100 or less.");
			accordion_5._fragment.c();
			text_13 = createText("\n");
			text_14 = createText("If the fit factor, as determined through an OSHA-accepted QNFT protocol, is equal to or greater than 100 for tight-fitting half facepieces, or equal to or greater than 500 for tight-fitting full facepieces, the QNFT has been passed with that respirator.");
			accordion_6._fragment.c();
			text_15 = createText("\n");
			text_16 = createText("Fit testing of tight-fitting atmosphere-supplying respirators and tight-fitting powered air-purifying respirators shall be accomplished by performing quantitative or qualitative fit testing in the negative pressure mode, regardless of the mode of operation (negative or positive pressure) that is used for respiratory protection.\n\n");
			strong = createElement("strong");
			strong.textContent = "1910.134(f)(8)(i)";
			text_18 = createText("\nQualitative fit testing of these respirators shall be accomplished by temporarily converting the respirator user's actual facepiece into a negative pressure respirator with appropriate filters, or by using an identical negative pressure air-purifying respirator facepiece with the same sealing surfaces as a surrogate for the atmosphere-supplying or powered air-purifying respirator facepiece.\n\n");
			strong_1 = createElement("strong");
			strong_1.textContent = "1910.134(f)(8)(ii)";
			text_20 = createText("\nQuantitative fit testing of these respirators shall be accomplished by modifying the facepiece to allow sampling inside the facepiece in the breathing zone of the user, midway between the nose and mouth. This requirement shall be accomplished by installing a permanent sampling probe onto a surrogate facepiece, or by using a sampling adapter designed to temporarily provide a means of sampling air from inside the facepiece.\n\n");
			strong_2 = createElement("strong");
			strong_2.textContent = "1910.134(f)(8)(iii)";
			text_22 = createText("\nAny modifications to the respirator facepiece for fit testing shall be completely removed, and the facepiece restored to NIOSH-approved configuration, before that facepiece can be used in the workplace.");
			accordion_7._fragment.c();
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			appendNode(text_2, accordion._slotted.default);
			accordion._mount(target, anchor);
			insertNode(text_3, target, anchor);
			appendNode(text_4, accordion_1._slotted.default);
			accordion_1._mount(target, anchor);
			insertNode(text_5, target, anchor);
			appendNode(text_6, accordion_2._slotted.default);
			accordion_2._mount(target, anchor);
			insertNode(text_7, target, anchor);
			appendNode(text_8, accordion_3._slotted.default);
			accordion_3._mount(target, anchor);
			insertNode(text_9, target, anchor);
			appendNode(text_10, accordion_4._slotted.default);
			accordion_4._mount(target, anchor);
			insertNode(text_11, target, anchor);
			appendNode(text_12, accordion_5._slotted.default);
			accordion_5._mount(target, anchor);
			insertNode(text_13, target, anchor);
			appendNode(text_14, accordion_6._slotted.default);
			accordion_6._mount(target, anchor);
			insertNode(text_15, target, anchor);
			appendNode(text_16, accordion_7._slotted.default);
			appendNode(strong, accordion_7._slotted.default);
			appendNode(text_18, accordion_7._slotted.default);
			appendNode(strong_1, accordion_7._slotted.default);
			appendNode(text_20, accordion_7._slotted.default);
			appendNode(strong_2, accordion_7._slotted.default);
			appendNode(text_22, accordion_7._slotted.default);
			accordion_7._mount(target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			accordion._unmount();
			detachNode(text_3);
			accordion_1._unmount();
			detachNode(text_5);
			accordion_2._unmount();
			detachNode(text_7);
			accordion_3._unmount();
			detachNode(text_9);
			accordion_4._unmount();
			detachNode(text_11);
			accordion_5._unmount();
			detachNode(text_13);
			accordion_6._unmount();
			detachNode(text_15);
			accordion_7._unmount();
		},

		d: function destroy$$1() {
			accordion.destroy(false);
			accordion_1.destroy(false);
			accordion_2.destroy(false);
			accordion_3.destroy(false);
			accordion_4.destroy(false);
			accordion_5.destroy(false);
			accordion_6.destroy(false);
			accordion_7.destroy(false);
		}
	};
}

function _1910_134f_fit_testing(options) {
	init(this, options);
	this._state = assign({}, options.data);

	if (!options._root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment$10(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(_1910_134f_fit_testing.prototype, proto);

/* client/data/content/1910-134g-use-of-respirators.html generated by Svelte v1.41.3 */
function create_main_fragment$11(state, component) {
	var h1, text_1, strong, text_3, strong_1, text_5, strong_2, text_7, strong_3, text_9, strong_4, text_11, text_12, strong_5, text_14, strong_6, text_16, strong_7, text_18, strong_8, text_20, strong_9, text_22, strong_10, text_24, text_25, text_26, strong_11, text_28, strong_12, text_30, strong_13, text_32, strong_14, text_34, strong_15, text_36, strong_16, text_38, strong_17, text_40, strong_18, text_42, strong_19, text_44, text_45, text_46, strong_20, text_48, strong_21, text_50, strong_22, text_52;

	var accordion = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(g)(1) Facepiece Seal Protection"
		}
	});

	var accordion_1 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(g)(2) Continuing Respirator Effectiveness"
		}
	});

	var accordion_2 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(g)(3) Procedures for IDLH Atmospheres"
		}
	});

	var accordion_3 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(g)(4) Interior Structural Firefighting Procedures "
		}
	});

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "1910.134(G) USE OF RESPIRATORS";
			text_1 = createText("\n\nThis paragraph requires employers to establish and implement procedures for the proper use of respirators. These requirements include prohibiting conditions that may result in facepiece seal leakage, preventing employees from removing respirators in hazardous environments, taking actions to ensure continued effective respirator operation throughout the work shift, and establishing procedures for the use of respirators in IDLH atmospheres or in interior structural firefighting situations.\n\n");
			strong = createElement("strong");
			strong.textContent = "1910.134(g)(1)(i)";
			text_3 = createText("\nThe employer shall not permit respirators with tight-fitting facepieces to be worn by employees who have:\n\n");
			strong_1 = createElement("strong");
			strong_1.textContent = "1910.134(g)(1)(i)(A)";
			text_5 = createText("\nFacial hair that comes between the sealing surface of the facepiece and the face or that interferes with valve function; or\n\n");
			strong_2 = createElement("strong");
			strong_2.textContent = "1910.134(g)(1)(i)(B)";
			text_7 = createText("\nAny condition that interferes with the face-to-facepiece seal or valve function.\n\n");
			strong_3 = createElement("strong");
			strong_3.textContent = "1910.134(g)(1)(ii)";
			text_9 = createText("\nIf an employee wears corrective glasses or goggles or other personal protective equipment, the employer shall ensure that such equipment is worn in a manner that does not interfere with the seal of the facepiece to the face of the user.\n\n");
			strong_4 = createElement("strong");
			strong_4.textContent = "1910.134(g)(1)(iii)";
			text_11 = createText("\nFor all tight-fitting respirators, the employer shall ensure that employees perform a user seal check each time they put on the respirator using the procedures in Appendix B-1 or procedures recommended by the respirator manufacturer that the employer demonstrates are as effective as those in Appendix B-1 of this section.");
			accordion._fragment.c();
			text_12 = createText("\n\n");
			strong_5 = createElement("strong");
			strong_5.textContent = "1910.134(g)(2)(i)";
			text_14 = createText("\nAppropriate surveillance shall be maintained of work area conditions and degree of employee exposure or stress. When there is a change in work area conditions or degree of employee exposure or stress that may affect respirator effectiveness, the employer shall reevaluate the continued effectiveness of the respirator.\n\n");
			strong_6 = createElement("strong");
			strong_6.textContent = "1910.134(g)(2)(ii)";
			text_16 = createText("\nThe employer shall ensure that employees leave the respirator use area:\n\n");
			strong_7 = createElement("strong");
			strong_7.textContent = "1910.134(g)(2)(ii)(A)";
			text_18 = createText("\nTo wash their faces and respirator facepieces as necessary to prevent eye or skin irritation associated with respirator use; or\n\n");
			strong_8 = createElement("strong");
			strong_8.textContent = "1910.134(g)(2)(ii)(B)";
			text_20 = createText("\nIf they detect vapor or gas breakthrough, changes in breathing resistance, or leakage of the facepiece; or\n\n");
			strong_9 = createElement("strong");
			strong_9.textContent = "1910.134(g)(2)(ii)(C)";
			text_22 = createText("\nTo replace the respirator or the filter, cartridge, or canister elements.\n\n");
			strong_10 = createElement("strong");
			strong_10.textContent = "1910.134(g)(2)(iii)";
			text_24 = createText("\nIf the employee detects vapor or gas breakthrough, changes in breathing resistance, or leakage of the facepiece, the employer must replace or repair the respirator before allowing the employee to return to the work area.");
			accordion_1._fragment.c();
			text_25 = createText("\n\n");
			text_26 = createText("For all IDLH atmospheres, the employer shall ensure that:\n\n");
			strong_11 = createElement("strong");
			strong_11.textContent = "1910.134(g)(3)(i)";
			text_28 = createText("\nOne employee or, when needed, more than one employee is located outside the IDLH atmosphere;\n\n");
			strong_12 = createElement("strong");
			strong_12.textContent = "1910.134(g)(3)(ii)";
			text_30 = createText("\nVisual, voice, or signal line communication is maintained between the employee(s) in the IDLH atmosphere and the employee(s) located outside the IDLH atmosphere;\n\n");
			strong_13 = createElement("strong");
			strong_13.textContent = "1910.134(g)(3)(iii)";
			text_32 = createText("\nThe employee(s) located outside the IDLH atmosphere are trained and equipped to provide effective emergency rescue;\n\n");
			strong_14 = createElement("strong");
			strong_14.textContent = "1910.134(g)(3)(iv)";
			text_34 = createText("\nThe employer or designee is notified before the employee(s) located outside the IDLH atmosphere enter the IDLH atmosphere to provide emergency rescue;\n\n");
			strong_15 = createElement("strong");
			strong_15.textContent = "1910.134(g)(3)(v)";
			text_36 = createText("\nThe employer or designee authorized to do so by the employer, once notified, provides necessary assistance appropriate to the situation;\n\n");
			strong_16 = createElement("strong");
			strong_16.textContent = "1910.134(g)(3)(vi)";
			text_38 = createText("\nEmployee(s) located outside the IDLH atmospheres are equipped with:\n\n");
			strong_17 = createElement("strong");
			strong_17.textContent = "1910.134(g)(3)(vi)(A)";
			text_40 = createText("\nPressure demand or other positive pressure SCBAs, or a pressure demand or other positive pressure supplied-air respirator with auxiliary SCBA; and either\n\n");
			strong_18 = createElement("strong");
			strong_18.textContent = "1910.134(g)(3)(vi)(B)";
			text_42 = createText("\nAppropriate retrieval equipment for removing the employee(s) who enter(s) these hazardous atmospheres where retrieval equipment would contribute to the rescue of the employee(s) and would not increase the overall risk resulting from entry; or\n\n");
			strong_19 = createElement("strong");
			strong_19.textContent = "1910.134(g)(3)(vi)(C)";
			text_44 = createText("\nEquivalent means for rescue where retrieval equipment is not required under paragraph (g)(3)(vi)(B).");
			accordion_2._fragment.c();
			text_45 = createText("\n\n");
			text_46 = createText("In addition to the requirements set forth under paragraph (g)(3), in interior structural fires, the employer shall ensure that:\n\n");
			strong_20 = createElement("strong");
			strong_20.textContent = "1910.134(g)(4)(i)";
			text_48 = createText("\nAt least two employees enter the IDLH atmosphere and remain in visual or voice contact with one another at all times;\n\n");
			strong_21 = createElement("strong");
			strong_21.textContent = "1910.134(g)(4)(ii)";
			text_50 = createText("\nAt least two employees are located outside the IDLH atmosphere; and\n\n");
			strong_22 = createElement("strong");
			strong_22.textContent = "1910.134(g)(4)(iii)";
			text_52 = createText("\nAll employees engaged in interior structural firefighting use SCBAs.\n\nNote 1 to paragraph (g): One of the two individuals located outside the IDLH atmosphere may be assigned to an additional role, such as incident commander in charge of the emergency or safety officer, so long as this individual is able to perform assistance or rescue activities without jeopardizing the safety or health of any firefighter working at the incident.\n\nNote 2 to paragraph (g): Nothing in this section is meant to preclude firefighters from performing emergency rescue activities before an entire team has assembled.");
			accordion_3._fragment.c();
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			appendNode(strong, accordion._slotted.default);
			appendNode(text_3, accordion._slotted.default);
			appendNode(strong_1, accordion._slotted.default);
			appendNode(text_5, accordion._slotted.default);
			appendNode(strong_2, accordion._slotted.default);
			appendNode(text_7, accordion._slotted.default);
			appendNode(strong_3, accordion._slotted.default);
			appendNode(text_9, accordion._slotted.default);
			appendNode(strong_4, accordion._slotted.default);
			appendNode(text_11, accordion._slotted.default);
			accordion._mount(target, anchor);
			insertNode(text_12, target, anchor);
			appendNode(strong_5, accordion_1._slotted.default);
			appendNode(text_14, accordion_1._slotted.default);
			appendNode(strong_6, accordion_1._slotted.default);
			appendNode(text_16, accordion_1._slotted.default);
			appendNode(strong_7, accordion_1._slotted.default);
			appendNode(text_18, accordion_1._slotted.default);
			appendNode(strong_8, accordion_1._slotted.default);
			appendNode(text_20, accordion_1._slotted.default);
			appendNode(strong_9, accordion_1._slotted.default);
			appendNode(text_22, accordion_1._slotted.default);
			appendNode(strong_10, accordion_1._slotted.default);
			appendNode(text_24, accordion_1._slotted.default);
			accordion_1._mount(target, anchor);
			insertNode(text_25, target, anchor);
			appendNode(text_26, accordion_2._slotted.default);
			appendNode(strong_11, accordion_2._slotted.default);
			appendNode(text_28, accordion_2._slotted.default);
			appendNode(strong_12, accordion_2._slotted.default);
			appendNode(text_30, accordion_2._slotted.default);
			appendNode(strong_13, accordion_2._slotted.default);
			appendNode(text_32, accordion_2._slotted.default);
			appendNode(strong_14, accordion_2._slotted.default);
			appendNode(text_34, accordion_2._slotted.default);
			appendNode(strong_15, accordion_2._slotted.default);
			appendNode(text_36, accordion_2._slotted.default);
			appendNode(strong_16, accordion_2._slotted.default);
			appendNode(text_38, accordion_2._slotted.default);
			appendNode(strong_17, accordion_2._slotted.default);
			appendNode(text_40, accordion_2._slotted.default);
			appendNode(strong_18, accordion_2._slotted.default);
			appendNode(text_42, accordion_2._slotted.default);
			appendNode(strong_19, accordion_2._slotted.default);
			appendNode(text_44, accordion_2._slotted.default);
			accordion_2._mount(target, anchor);
			insertNode(text_45, target, anchor);
			appendNode(text_46, accordion_3._slotted.default);
			appendNode(strong_20, accordion_3._slotted.default);
			appendNode(text_48, accordion_3._slotted.default);
			appendNode(strong_21, accordion_3._slotted.default);
			appendNode(text_50, accordion_3._slotted.default);
			appendNode(strong_22, accordion_3._slotted.default);
			appendNode(text_52, accordion_3._slotted.default);
			accordion_3._mount(target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			accordion._unmount();
			detachNode(text_12);
			accordion_1._unmount();
			detachNode(text_25);
			accordion_2._unmount();
			detachNode(text_45);
			accordion_3._unmount();
		},

		d: function destroy$$1() {
			accordion.destroy(false);
			accordion_1.destroy(false);
			accordion_2.destroy(false);
			accordion_3.destroy(false);
		}
	};
}

function _1910_134g_use_of_respirators(options) {
	init(this, options);
	this._state = assign({}, options.data);

	if (!options._root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment$11(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(_1910_134g_use_of_respirators.prototype, proto);

/* client/data/content/1910-134h-maintenance-and-care-of-respirators.html generated by Svelte v1.41.3 */
function create_main_fragment$12(state, component) {
	var h1, text_1, text_2, strong, text_4, strong_1, text_6, strong_2, text_8, strong_3, text_10, text_11, text_12, strong_4, text_14, strong_5, text_16, strong_6, text_18, strong_7, text_20, strong_8, text_22, text_23, strong_9, text_25, strong_10, text_27, strong_11, text_29, strong_12, text_31, strong_13, text_33, strong_14, text_35, strong_15, text_37, strong_16, text_39, strong_17, text_41, strong_18, text_43, strong_19, text_45, text_46, text_47, strong_20, text_49, strong_21, text_51, strong_22, text_53;

	var accordion = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(h)(1) Cleaning and Disinfecting"
		}
	});

	var accordion_1 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "1910.134(h)(2) Storage" }
	});

	var accordion_2 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "1910.134(h)(3) Inspection" }
	});

	var accordion_3 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "1910.134(h)(4) Repairs" }
	});

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "1910.134(H) MAINTENANCE AND CARE OF RESPIRATORS";
			text_1 = createText("\n\nThis paragraph requires the employer to provide for the cleaning and disinfecting, storage, inspection, and repair of respirators used by employees.\n");
			text_2 = createText("The employer shall provide each respirator user with a respirator that is clean, sanitary, and in good working order. The employer shall ensure that respirators are cleaned and disinfected using the procedures in Appendix B-2 of this section, or procedures recommended by the respirator manufacturer, provided that such procedures are of equivalent effectiveness. The respirators shall be cleaned and disinfected at the following intervals:\n\n");
			strong = createElement("strong");
			strong.textContent = "1910.134(h)(1)(i)";
			text_4 = createText("\nRespirators issued for the exclusive use of an employee shall be cleaned and disinfected as often as necessary to be maintained in a sanitary condition;\n\n");
			strong_1 = createElement("strong");
			strong_1.textContent = "1910.134(h)(1)(ii)";
			text_6 = createText("\nRespirators issued to more than one employee shall be cleaned and disinfected before being worn by different individuals;\n\n");
			strong_2 = createElement("strong");
			strong_2.textContent = "1910.134(h)(1)(iii)";
			text_8 = createText("\nRespirators maintained for emergency use shall be cleaned and disinfected after each use; and\n\n");
			strong_3 = createElement("strong");
			strong_3.textContent = "1910.134(h)(1)(iv)";
			text_10 = createText("\nRespirators used in fit testing and training shall be cleaned and disinfected after each use.");
			accordion._fragment.c();
			text_11 = createText("\n\n");
			text_12 = createText("The employer shall ensure that respirators are stored as follows:\n\n");
			strong_4 = createElement("strong");
			strong_4.textContent = "1910.134(h)(2)(i)";
			text_14 = createText("\nAll respirators shall be stored to protect them from damage, contamination, dust, sunlight, extreme temperatures, excessive moisture, and damaging chemicals, and they shall be packed or stored to prevent deformation of the facepiece and exhalation valve.\n\n");
			strong_5 = createElement("strong");
			strong_5.textContent = "1910.134(h)(2)(ii)";
			text_16 = createText("\nIn addition to the requirements of paragraph (h)(2)(i) of this section, emergency respirators shall be:\n\n");
			strong_6 = createElement("strong");
			strong_6.textContent = "1910.134(h)(2)(ii)(A)";
			text_18 = createText("\nKept accessible to the work area;\n\n");
			strong_7 = createElement("strong");
			strong_7.textContent = "1910.134(h)(2)(ii)(B)";
			text_20 = createText("\nStored in compartments or in covers that are clearly marked as containing emergency respirators; and\n\n");
			strong_8 = createElement("strong");
			strong_8.textContent = "1910.134(h)(2)(ii)(C)";
			text_22 = createText("\nStored in accordance with any applicable manufacturer instructions.");
			accordion_1._fragment.c();
			text_23 = createText("\n\n");
			strong_9 = createElement("strong");
			strong_9.textContent = "1910.134(h)(3)(i)";
			text_25 = createText("\nThe employer shall ensure that respirators are inspected as follows:\n\n");
			strong_10 = createElement("strong");
			strong_10.textContent = "1910.134(h)(3)(i)(A)";
			text_27 = createText("\nAll respirators used in routine situations shall be inspected before each use and during cleaning;\n\n");
			strong_11 = createElement("strong");
			strong_11.textContent = "1910.134(h)(3)(i)(B)";
			text_29 = createText("\nAll respirators maintained for use in emergency situations shall be inspected at least monthly and in accordance with the manufacturer's recommendations, and shall be checked for proper function before and after each use; and\n\n");
			strong_12 = createElement("strong");
			strong_12.textContent = "1910.134(h)(3)(i)(C)";
			text_31 = createText("\nEmergency escape-only respirators shall be inspected before being carried into the workplace for use.\n\n");
			strong_13 = createElement("strong");
			strong_13.textContent = "1910.134(h)(3)(ii)";
			text_33 = createText("\nThe employer shall ensure that respirator inspections include the following:\n\n");
			strong_14 = createElement("strong");
			strong_14.textContent = "1910.134(h)(3)(ii)(A)";
			text_35 = createText("\nA check of respirator function, tightness of connections, and the condition of the various parts including, but not limited to, the facepiece, head straps, valves, connecting tube, and cartridges, canisters or filters; and\n\n");
			strong_15 = createElement("strong");
			strong_15.textContent = "1910.134(h)(3)(ii)(B)";
			text_37 = createText("\nA check of elastomeric parts for pliability and signs of deterioration.\n\n");
			strong_16 = createElement("strong");
			strong_16.textContent = "1910.134(h)(3)(iii)";
			text_39 = createText("\nIn addition to the requirements of paragraphs (h)(3)(i) and (ii) of this section, self-contained breathing apparatus shall be inspected monthly. Air and oxygen cylinders shall be maintained in a fully charged state and shall be recharged when the pressure falls to 90% of the manufacturer's recommended pressure level. The employer shall determine that the regulator and warning devices function properly.\n");
			strong_17 = createElement("strong");
			strong_17.textContent = "1910.134(h)(3)(iv)";
			text_41 = createText("\nFor respirators maintained for emergency use, the employer shall:\n\n");
			strong_18 = createElement("strong");
			strong_18.textContent = "1910.134(h)(3)(iv)(A)";
			text_43 = createText("\nCertify the respirator by documenting the date the inspection was performed, the name (or signature) of the person who made the inspection, the findings, required remedial action, and a serial number or other means of identifying the inspected respirator; and\n\n");
			strong_19 = createElement("strong");
			strong_19.textContent = "1910.134(h)(3)(iv)(B)";
			text_45 = createText("\nProvide this information on a tag or label that is attached to the storage compartment for the respirator, is kept with the respirator, or is included in inspection reports stored as paper or electronic files. This information shall be maintained until replaced following a subsequent certification.");
			accordion_2._fragment.c();
			text_46 = createText("\n\n");
			text_47 = createText("The employer shall ensure that respirators that fail an inspection or are otherwise found to be defective are removed from service, and are discarded or repaired or adjusted in accordance with the following procedures:\n\n");
			strong_20 = createElement("strong");
			strong_20.textContent = "1910.134(h)(4)(i)";
			text_49 = createText("\nRepairs or adjustments to respirators are to be made only by persons appropriately trained to perform such operations and shall use only the respirator manufacturer's NIOSH-approved parts designed for the respirator;\n\n");
			strong_21 = createElement("strong");
			strong_21.textContent = "1910.134(h)(4)(ii)";
			text_51 = createText("\nRepairs shall be made according to the manufacturer's recommendations and specifications for the type and extent of repairs to be performed; and\n\n");
			strong_22 = createElement("strong");
			strong_22.textContent = "1910.134(h)(4)(iii)";
			text_53 = createText("\nReducing and admission valves, regulators, and alarms shall be adjusted or repaired only by the manufacturer or a technician trained by the manufacturer.");
			accordion_3._fragment.c();
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			appendNode(text_2, accordion._slotted.default);
			appendNode(strong, accordion._slotted.default);
			appendNode(text_4, accordion._slotted.default);
			appendNode(strong_1, accordion._slotted.default);
			appendNode(text_6, accordion._slotted.default);
			appendNode(strong_2, accordion._slotted.default);
			appendNode(text_8, accordion._slotted.default);
			appendNode(strong_3, accordion._slotted.default);
			appendNode(text_10, accordion._slotted.default);
			accordion._mount(target, anchor);
			insertNode(text_11, target, anchor);
			appendNode(text_12, accordion_1._slotted.default);
			appendNode(strong_4, accordion_1._slotted.default);
			appendNode(text_14, accordion_1._slotted.default);
			appendNode(strong_5, accordion_1._slotted.default);
			appendNode(text_16, accordion_1._slotted.default);
			appendNode(strong_6, accordion_1._slotted.default);
			appendNode(text_18, accordion_1._slotted.default);
			appendNode(strong_7, accordion_1._slotted.default);
			appendNode(text_20, accordion_1._slotted.default);
			appendNode(strong_8, accordion_1._slotted.default);
			appendNode(text_22, accordion_1._slotted.default);
			accordion_1._mount(target, anchor);
			insertNode(text_23, target, anchor);
			appendNode(strong_9, accordion_2._slotted.default);
			appendNode(text_25, accordion_2._slotted.default);
			appendNode(strong_10, accordion_2._slotted.default);
			appendNode(text_27, accordion_2._slotted.default);
			appendNode(strong_11, accordion_2._slotted.default);
			appendNode(text_29, accordion_2._slotted.default);
			appendNode(strong_12, accordion_2._slotted.default);
			appendNode(text_31, accordion_2._slotted.default);
			appendNode(strong_13, accordion_2._slotted.default);
			appendNode(text_33, accordion_2._slotted.default);
			appendNode(strong_14, accordion_2._slotted.default);
			appendNode(text_35, accordion_2._slotted.default);
			appendNode(strong_15, accordion_2._slotted.default);
			appendNode(text_37, accordion_2._slotted.default);
			appendNode(strong_16, accordion_2._slotted.default);
			appendNode(text_39, accordion_2._slotted.default);
			appendNode(strong_17, accordion_2._slotted.default);
			appendNode(text_41, accordion_2._slotted.default);
			appendNode(strong_18, accordion_2._slotted.default);
			appendNode(text_43, accordion_2._slotted.default);
			appendNode(strong_19, accordion_2._slotted.default);
			appendNode(text_45, accordion_2._slotted.default);
			accordion_2._mount(target, anchor);
			insertNode(text_46, target, anchor);
			appendNode(text_47, accordion_3._slotted.default);
			appendNode(strong_20, accordion_3._slotted.default);
			appendNode(text_49, accordion_3._slotted.default);
			appendNode(strong_21, accordion_3._slotted.default);
			appendNode(text_51, accordion_3._slotted.default);
			appendNode(strong_22, accordion_3._slotted.default);
			appendNode(text_53, accordion_3._slotted.default);
			accordion_3._mount(target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			accordion._unmount();
			detachNode(text_11);
			accordion_1._unmount();
			detachNode(text_23);
			accordion_2._unmount();
			detachNode(text_46);
			accordion_3._unmount();
		},

		d: function destroy$$1() {
			accordion.destroy(false);
			accordion_1.destroy(false);
			accordion_2.destroy(false);
			accordion_3.destroy(false);
		}
	};
}

function _1910_134h_maintenance_and_care_of_respirators(options) {
	init(this, options);
	this._state = assign({}, options.data);

	if (!options._root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment$12(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(_1910_134h_maintenance_and_care_of_respirators.prototype, proto);

/* client/data/content/1910-134i-breathing-air-quality-and-use.html generated by Svelte v1.41.3 */
function create_main_fragment$13(state, component) {
	var h1, text_1, text_2, strong, text_4, strong_1, text_6, strong_2, text_8, strong_3, text_10, strong_4, text_12, strong_5, text_14, strong_6, text_16, text_17, text_18, text_19, text_20, text_21, text_22, strong_7, text_24, strong_8, text_26, strong_9, text_28, text_29, text_30, strong_10, text_32, strong_11, text_34, strong_12, text_36, strong_13, text_38, text_39, text_40, text_41, text_42, text_43, text_44, text_45, text_46;

	var accordion = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(i)(1) Compressed or Liquid Air or Oxygen"
		}
	});

	var accordion_1 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(i)(2) Compressed Oxygen"
		}
	});

	var accordion_2 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(i)(3) Oxygen Concentrations"
		}
	});

	var accordion_3 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(i)(4) Breathing Air Cylinders"
		}
	});

	var accordion_4 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(i)(5) Breathing Air Compressors"
		}
	});

	var accordion_5 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(i)(6) Non-oil-lubricated Compressors"
		}
	});

	var accordion_6 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(i)(7) Oil-lubricated Compressors"
		}
	});

	var accordion_7 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(i)(8) Couplings and Air Lines"
		}
	});

	var accordion_8 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(i)(9) Breathing-gas Containers"
		}
	});

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "1910.134(I) BREATHING AIR QUALITY AND USE";
			text_1 = createText("\n\nThis paragraph requires the employer to provide employees using atmosphere-supplying respirators (supplied-air and SCBA) with breathing gases of high purity.\n");
			text_2 = createText("The employer shall ensure that compressed air, compressed oxygen, liquid air, and liquid oxygen used for respiration accords with the following specifications:\n\n");
			strong = createElement("strong");
			strong.textContent = "1910.134(i)(1)(i)";
			text_4 = createText("\nCompressed and liquid oxygen shall meet the United States Pharmacopoeia requirements for medical or breathing oxygen; and\n\n");
			strong_1 = createElement("strong");
			strong_1.textContent = "1910.134(i)(1)(ii)";
			text_6 = createText("\nCompressed breathing air shall meet at least the requirements for Grade D breathing air described in ANSI/Compressed Gas Association Commodity Specification for Air, G-7.1-1989, to include:\n\n");
			strong_2 = createElement("strong");
			strong_2.textContent = "1910.134(i)(1)(ii)(A)";
			text_8 = createText("\nOxygen content (v/v) of 19.5-23.5%;\n\n");
			strong_3 = createElement("strong");
			strong_3.textContent = "1910.134(i)(1)(ii)(B)";
			text_10 = createText("\nHydrocarbon (condensed) content of 5 milligrams per cubic meter of air or less;\n\n");
			strong_4 = createElement("strong");
			strong_4.textContent = "1910.134(i)(1)(ii)(C)";
			text_12 = createText("\nCarbon monoxide (CO) content of 10 ppm or less;\n\n");
			strong_5 = createElement("strong");
			strong_5.textContent = "1910.134(i)(1)(ii)(D)";
			text_14 = createText("\nCarbon dioxide content of 1,000 ppm or less; and\n\n");
			strong_6 = createElement("strong");
			strong_6.textContent = "1910.134(i)(1)(ii)(E)";
			text_16 = createText("\nLack of noticeable odor.");
			accordion._fragment.c();
			text_17 = createText("\n\n");
			text_18 = createText("The employer shall ensure that compressed oxygen is not used in atmosphere-supplying respirators that have previously used compressed air.");
			accordion_1._fragment.c();
			text_19 = createText("\n\n");
			text_20 = createText("The employer shall ensure that oxygen concentrations greater than 23.5% are used only in equipment designed for oxygen service or distribution.");
			accordion_2._fragment.c();
			text_21 = createText("\n\n");
			text_22 = createText("The employer shall ensure that cylinders used to supply breathing air to respirators meet the following requirements:\n\n");
			strong_7 = createElement("strong");
			strong_7.textContent = "1910.134(i)(4)(i)";
			text_24 = createText("\nCylinders are tested and maintained as prescribed in the Shipping Container Specification Regulations of the Department of Transportation (49 CFR part 180);\n\n");
			strong_8 = createElement("strong");
			strong_8.textContent = "1910.134(i)(4)(ii)";
			text_26 = createText("\nCylinders of purchased breathing air have a certificate of analysis from the supplier that the breathing air meets the requirements for Grade D breathing air; and\n\n");
			strong_9 = createElement("strong");
			strong_9.textContent = "1910.134(i)(4)(iii)";
			text_28 = createText("\nThe moisture content in the cylinder does not exceed a dew point of -50 deg.F (-45.6 deg.C) at 1 atmosphere pressure.");
			accordion_3._fragment.c();
			text_29 = createText("\n\n");
			text_30 = createText("The employer shall ensure that compressors used to supply breathing air to respirators are constructed and situated so as to:\n\n");
			strong_10 = createElement("strong");
			strong_10.textContent = "1910.134(i)(5)(i)";
			text_32 = createText("\nPrevent entry of contaminated air into the air-supply system;\n\n");
			strong_11 = createElement("strong");
			strong_11.textContent = "1910.134(i)(5)(ii)";
			text_34 = createText("\nMinimize moisture content so that the dew point at 1 atmosphere pressure is 10 degrees F (5.56 deg.C) below the ambient temperature;\n\n");
			strong_12 = createElement("strong");
			strong_12.textContent = "1910.134(i)(5)(iii)";
			text_36 = createText("\nHave suitable in-line air-purifying sorbent beds and filters to further ensure breathing air quality. Sorbent beds and filters shall be maintained and replaced or refurbished periodically following the manufacturer's instructions.\n\n");
			strong_13 = createElement("strong");
			strong_13.textContent = "1910.134(i)(5)(iv)";
			text_38 = createText("\nHave a tag containing the most recent change date and the signature of the person authorized by the employer to perform the change. The tag shall be maintained at the compressor.");
			accordion_4._fragment.c();
			text_39 = createText("\n\n");
			text_40 = createText("For compressors that are not oil-lubricated, the employer shall ensure that carbon monoxide levels in the breathing air do not exceed 10 ppm.");
			accordion_5._fragment.c();
			text_41 = createText("\n\n");
			text_42 = createText("For oil-lubricated compressors, the employer shall use a high-temperature or carbon monoxide alarm, or both, to monitor carbon monoxide levels. If only high-temperature alarms are used, the air supply shall be monitored at intervals sufficient to prevent carbon monoxide in the breathing air from exceeding 10 ppm.");
			accordion_6._fragment.c();
			text_43 = createText("\n\n");
			text_44 = createText("The employer shall ensure that breathing air couplings are incompatible with outlets for nonrespirable worksite air or other gas systems. No asphyxiating substance shall be introduced into breathing air lines.");
			accordion_7._fragment.c();
			text_45 = createText("\n\n");
			text_46 = createText("The employer shall use only the respirator manufacturer's NIOSH-approved breathing-gas containers, marked and maintained in accordance with the Quality Assurance provisions of the NIOSH approval for the SCBA as issued in accordance with the NIOSH respirator-certification standard at 42 CFR part 84.");
			accordion_8._fragment.c();
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			appendNode(text_2, accordion._slotted.default);
			appendNode(strong, accordion._slotted.default);
			appendNode(text_4, accordion._slotted.default);
			appendNode(strong_1, accordion._slotted.default);
			appendNode(text_6, accordion._slotted.default);
			appendNode(strong_2, accordion._slotted.default);
			appendNode(text_8, accordion._slotted.default);
			appendNode(strong_3, accordion._slotted.default);
			appendNode(text_10, accordion._slotted.default);
			appendNode(strong_4, accordion._slotted.default);
			appendNode(text_12, accordion._slotted.default);
			appendNode(strong_5, accordion._slotted.default);
			appendNode(text_14, accordion._slotted.default);
			appendNode(strong_6, accordion._slotted.default);
			appendNode(text_16, accordion._slotted.default);
			accordion._mount(target, anchor);
			insertNode(text_17, target, anchor);
			appendNode(text_18, accordion_1._slotted.default);
			accordion_1._mount(target, anchor);
			insertNode(text_19, target, anchor);
			appendNode(text_20, accordion_2._slotted.default);
			accordion_2._mount(target, anchor);
			insertNode(text_21, target, anchor);
			appendNode(text_22, accordion_3._slotted.default);
			appendNode(strong_7, accordion_3._slotted.default);
			appendNode(text_24, accordion_3._slotted.default);
			appendNode(strong_8, accordion_3._slotted.default);
			appendNode(text_26, accordion_3._slotted.default);
			appendNode(strong_9, accordion_3._slotted.default);
			appendNode(text_28, accordion_3._slotted.default);
			accordion_3._mount(target, anchor);
			insertNode(text_29, target, anchor);
			appendNode(text_30, accordion_4._slotted.default);
			appendNode(strong_10, accordion_4._slotted.default);
			appendNode(text_32, accordion_4._slotted.default);
			appendNode(strong_11, accordion_4._slotted.default);
			appendNode(text_34, accordion_4._slotted.default);
			appendNode(strong_12, accordion_4._slotted.default);
			appendNode(text_36, accordion_4._slotted.default);
			appendNode(strong_13, accordion_4._slotted.default);
			appendNode(text_38, accordion_4._slotted.default);
			accordion_4._mount(target, anchor);
			insertNode(text_39, target, anchor);
			appendNode(text_40, accordion_5._slotted.default);
			accordion_5._mount(target, anchor);
			insertNode(text_41, target, anchor);
			appendNode(text_42, accordion_6._slotted.default);
			accordion_6._mount(target, anchor);
			insertNode(text_43, target, anchor);
			appendNode(text_44, accordion_7._slotted.default);
			accordion_7._mount(target, anchor);
			insertNode(text_45, target, anchor);
			appendNode(text_46, accordion_8._slotted.default);
			accordion_8._mount(target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			accordion._unmount();
			detachNode(text_17);
			accordion_1._unmount();
			detachNode(text_19);
			accordion_2._unmount();
			detachNode(text_21);
			accordion_3._unmount();
			detachNode(text_29);
			accordion_4._unmount();
			detachNode(text_39);
			accordion_5._unmount();
			detachNode(text_41);
			accordion_6._unmount();
			detachNode(text_43);
			accordion_7._unmount();
			detachNode(text_45);
			accordion_8._unmount();
		},

		d: function destroy$$1() {
			accordion.destroy(false);
			accordion_1.destroy(false);
			accordion_2.destroy(false);
			accordion_3.destroy(false);
			accordion_4.destroy(false);
			accordion_5.destroy(false);
			accordion_6.destroy(false);
			accordion_7.destroy(false);
			accordion_8.destroy(false);
		}
	};
}

function _1910_134i_breathing_air_quality_and_use(options) {
	init(this, options);
	this._state = assign({}, options.data);

	if (!options._root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment$13(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(_1910_134i_breathing_air_quality_and_use.prototype, proto);

/* client/data/content/1910-134j-identification-of-filters-cartridges-and-canisters.html generated by Svelte v1.41.3 */
function create_main_fragment$14(state, component) {
	var h1, text_1;

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "1910.134(J) IDENTIFICATION OF FILTERS, CARTRIDGES, AND CANISTERS";
			text_1 = createText("\n\nThe employer shall ensure that all filters, cartridges and canisters used in the workplace are labeled and color coded with the NIOSH approval label and that the label is not removed and remains legible.");
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
		},

		d: noop
	};
}

function _1910_134j_identification_of_filters_cartridges_and_canisters(options) {
	init(this, options);
	this._state = assign({}, options.data);

	this._fragment = create_main_fragment$14(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);
	}
}

assign(_1910_134j_identification_of_filters_cartridges_and_canisters.prototype, proto);

/* client/data/content/1910-134k-training-and-information.html generated by Svelte v1.41.3 */
function create_main_fragment$15(state, component) {
	var h1, text_1, text_2, strong, text_4, strong_1, text_6, strong_2, text_8, strong_3, text_10, strong_4, text_12, strong_5, text_14, strong_6, text_16, text_17, text_18, text_19, text_20, text_21, text_22, text_23, text_24, strong_7, text_26, strong_8, text_28, strong_9, text_30, text_31, text_32;

	var accordion = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(k)(1) Employee Knowledge"
		}
	});

	var accordion_1 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(k)(2) Employee Understanding"
		}
	});

	var accordion_2 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(k)(3) Training Prior to Use"
		}
	});

	var accordion_3 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(k)(4) Previous Training"
		}
	});

	var accordion_4 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "1910.134(k)(5) Retraining" }
	});

	var accordion_5 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(k)(6) Advisory Information"
		}
	});

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "1910.134(K) TRAINING AND INFORMATION";
			text_1 = createText("\n\nThis paragraph requires the employer to provide effective training to employees who are required to use respirators. The training must be comprehensive, understandable, and recur annually, and more often if necessary. This paragraph also requires the employer to provide the basic information on respirators in Appendix D of this section to employees who wear respirators when not required by this section or by the employer to do so.\n");
			text_2 = createText("The employer shall ensure that each employee can demonstrate knowledge of at least the following:\n\n");
			strong = createElement("strong");
			strong.textContent = "1910.134(k)(1)(i)";
			text_4 = createText("\nWhy the respirator is necessary and how improper fit, usage, or maintenance can compromise the protective effect of the respirator;\n\n");
			strong_1 = createElement("strong");
			strong_1.textContent = "1910.134(k)(1)(ii)";
			text_6 = createText("\nWhat the limitations and capabilities of the respirator are;\n\n");
			strong_2 = createElement("strong");
			strong_2.textContent = "1910.134(k)(1)(iii)";
			text_8 = createText("\nHow to use the respirator effectively in emergency situations, including situations in which the respirator malfunctions;\n\n");
			strong_3 = createElement("strong");
			strong_3.textContent = "1910.134(k)(1)(iv)";
			text_10 = createText("\nHow to inspect, put on and remove, use, and check the seals of the respirator;\n\n");
			strong_4 = createElement("strong");
			strong_4.textContent = "1910.134(k)(1)(v)";
			text_12 = createText("\nWhat the procedures are for maintenance and storage of the respirator;\n\n");
			strong_5 = createElement("strong");
			strong_5.textContent = "1910.134(k)(1)(vi)";
			text_14 = createText("\nHow to recognize medical signs and symptoms that may limit or prevent the effective use of respirators; and\n\n");
			strong_6 = createElement("strong");
			strong_6.textContent = "1910.134(k)(1)(vii)";
			text_16 = createText("\nThe general requirements of this section.");
			accordion._fragment.c();
			text_17 = createText("\n\n");
			text_18 = createText("The training shall be conducted in a manner that is understandable to the employee.");
			accordion_1._fragment.c();
			text_19 = createText("\n\n");
			text_20 = createText("The employer shall provide the training prior to requiring the employee to use a respirator in the workplace.");
			accordion_2._fragment.c();
			text_21 = createText("\n\n");
			text_22 = createText("An employer who is able to demonstrate that a new employee has received training within the last 12 months that addresses the elements specified in paragraph (k)(1)(i) through (vii) is not required to repeat such training provided that, as required by paragraph (k)(1), the employee can demonstrate knowledge of those element(s). Previous training not repeated initially by the employer must be provided no later than 12 months from the date of the previous training.");
			accordion_3._fragment.c();
			text_23 = createText("\n");
			text_24 = createText("Retraining shall be administered annually, and when the following situations occur:\n\n");
			strong_7 = createElement("strong");
			strong_7.textContent = "1910.134(k)(5)(i)";
			text_26 = createText("\nChanges in the workplace or the type of respirator render previous training obsolete;\n\n");
			strong_8 = createElement("strong");
			strong_8.textContent = "1910.134(k)(5)(ii)";
			text_28 = createText("\nInadequacies in the employee's knowledge or use of the respirator indicate that the employee has not retained the requisite understanding or skill; or\n\n");
			strong_9 = createElement("strong");
			strong_9.textContent = "1910.134(k)(5)(iii)";
			text_30 = createText("\nAny other situation arises in which retraining appears necessary to ensure safe respirator use.");
			accordion_4._fragment.c();
			text_31 = createText("\n\n");
			text_32 = createText("The basic advisory information on respirators, as presented in Appendix D of this section, shall be provided by the employer in any written or oral format, to employees who wear respirators when such use is not required by this section or by the employer.");
			accordion_5._fragment.c();
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			appendNode(text_2, accordion._slotted.default);
			appendNode(strong, accordion._slotted.default);
			appendNode(text_4, accordion._slotted.default);
			appendNode(strong_1, accordion._slotted.default);
			appendNode(text_6, accordion._slotted.default);
			appendNode(strong_2, accordion._slotted.default);
			appendNode(text_8, accordion._slotted.default);
			appendNode(strong_3, accordion._slotted.default);
			appendNode(text_10, accordion._slotted.default);
			appendNode(strong_4, accordion._slotted.default);
			appendNode(text_12, accordion._slotted.default);
			appendNode(strong_5, accordion._slotted.default);
			appendNode(text_14, accordion._slotted.default);
			appendNode(strong_6, accordion._slotted.default);
			appendNode(text_16, accordion._slotted.default);
			accordion._mount(target, anchor);
			insertNode(text_17, target, anchor);
			appendNode(text_18, accordion_1._slotted.default);
			accordion_1._mount(target, anchor);
			insertNode(text_19, target, anchor);
			appendNode(text_20, accordion_2._slotted.default);
			accordion_2._mount(target, anchor);
			insertNode(text_21, target, anchor);
			appendNode(text_22, accordion_3._slotted.default);
			accordion_3._mount(target, anchor);
			insertNode(text_23, target, anchor);
			appendNode(text_24, accordion_4._slotted.default);
			appendNode(strong_7, accordion_4._slotted.default);
			appendNode(text_26, accordion_4._slotted.default);
			appendNode(strong_8, accordion_4._slotted.default);
			appendNode(text_28, accordion_4._slotted.default);
			appendNode(strong_9, accordion_4._slotted.default);
			appendNode(text_30, accordion_4._slotted.default);
			accordion_4._mount(target, anchor);
			insertNode(text_31, target, anchor);
			appendNode(text_32, accordion_5._slotted.default);
			accordion_5._mount(target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			accordion._unmount();
			detachNode(text_17);
			accordion_1._unmount();
			detachNode(text_19);
			accordion_2._unmount();
			detachNode(text_21);
			accordion_3._unmount();
			detachNode(text_23);
			accordion_4._unmount();
			detachNode(text_31);
			accordion_5._unmount();
		},

		d: function destroy$$1() {
			accordion.destroy(false);
			accordion_1.destroy(false);
			accordion_2.destroy(false);
			accordion_3.destroy(false);
			accordion_4.destroy(false);
			accordion_5.destroy(false);
		}
	};
}

function _1910_134k_training_and_information(options) {
	init(this, options);
	this._state = assign({}, options.data);

	if (!options._root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment$15(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(_1910_134k_training_and_information.prototype, proto);

/* client/data/content/1910-134l-program-evaluation.html generated by Svelte v1.41.3 */
function create_main_fragment$16(state, component) {
	var h1, text_1, text_2, text_3, text_4, strong, text_6, strong_1, text_8, strong_2, text_10, strong_3, text_12;

	var accordion = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(l)(1) Workplace Evaluations"
		}
	});

	var accordion_1 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(l)(2) Program Assessment"
		}
	});

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "1910.134(L) PROGRAM EVALUATION";
			text_1 = createText("\n\nThis section requires the employer to conduct evaluations of the workplace to ensure that the written respiratory protection program is being properly implemented, and to consult employees to ensure that they are using the respirators properly.\n\n");
			text_2 = createText("The employer shall conduct evaluations of the workplace as necessary to ensure that the provisions of the current written program are being effectively implemented and that it continues to be effective.");
			accordion._fragment.c();
			text_3 = createText("\n\n");
			text_4 = createText("The employer shall regularly consult employees required to use respirators to assess the employees' views on program effectiveness and to identify any problems. Any problems that are identified during this assessment shall be corrected. Factors to be assessed include, but are not limited to:\n\n");
			strong = createElement("strong");
			strong.textContent = "1910.134(l)(2)(i)";
			text_6 = createText("\nRespirator fit (including the ability to use the respirator without interfering with effective workplace performance);\n\n");
			strong_1 = createElement("strong");
			strong_1.textContent = "1910.134(l)(2)(ii)";
			text_8 = createText("\nAppropriate respirator selection for the hazards to which the employee is exposed;\n\n");
			strong_2 = createElement("strong");
			strong_2.textContent = "1910.134(l)(2)(iii)";
			text_10 = createText("\nProper respirator use under the workplace conditions the employee encounters; and\n\n");
			strong_3 = createElement("strong");
			strong_3.textContent = "1910.134(l)(2)(iv)";
			text_12 = createText("\nProper respirator maintenance.");
			accordion_1._fragment.c();
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			appendNode(text_2, accordion._slotted.default);
			accordion._mount(target, anchor);
			insertNode(text_3, target, anchor);
			appendNode(text_4, accordion_1._slotted.default);
			appendNode(strong, accordion_1._slotted.default);
			appendNode(text_6, accordion_1._slotted.default);
			appendNode(strong_1, accordion_1._slotted.default);
			appendNode(text_8, accordion_1._slotted.default);
			appendNode(strong_2, accordion_1._slotted.default);
			appendNode(text_10, accordion_1._slotted.default);
			appendNode(strong_3, accordion_1._slotted.default);
			appendNode(text_12, accordion_1._slotted.default);
			accordion_1._mount(target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			accordion._unmount();
			detachNode(text_3);
			accordion_1._unmount();
		},

		d: function destroy$$1() {
			accordion.destroy(false);
			accordion_1.destroy(false);
		}
	};
}

function _1910_134l_program_evaluation(options) {
	init(this, options);
	this._state = assign({}, options.data);

	if (!options._root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment$16(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(_1910_134l_program_evaluation.prototype, proto);

/* client/data/content/1910-134m-recordkeeping.html generated by Svelte v1.41.3 */
function create_main_fragment$17(state, component) {
	var h1, text_1, text_2, text_3, strong, text_5, strong_1, text_7, strong_2, text_9, strong_3, text_11, strong_4, text_13, strong_5, text_15, strong_6, text_17, text_18, text_19, text_20, text_21;

	var accordion = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(m)(1) Medical Evaluation"
		}
	});

	var accordion_1 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "1910.134(m)(2) Fit Testing" }
	});

	var accordion_2 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "1910.134(m)(3) Copy of Program" }
	});

	var accordion_3 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "1910.134(m)(4) Material for Employees"
		}
	});

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "1910.134(M) RECORDKEEPING";
			text_1 = createText("\n\nThis section requires the employer to establish and retain written information regarding medical evaluations, fit testing, and the respirator program. This information will facilitate employee involvement in the respirator program, assist the employer in auditing the adequacy of the program, and provide a record for compliance determinations by OSHA.\n\n");
			text_2 = createText("Records of medical evaluations required by this section must be retained and made available in accordance with 29 CFR 1910.1020.");
			accordion._fragment.c();
			text_3 = createText("\n\n");
			strong = createElement("strong");
			strong.textContent = "1910.134(m)(2)(i)";
			text_5 = createText("\nThe employer shall establish a record of the qualitative and quantitative fit tests administered to an employee including:\n\n");
			strong_1 = createElement("strong");
			strong_1.textContent = "1910.134(m)(2)(i)(A)";
			text_7 = createText("\nThe name or identification of the employee tested;\n\n");
			strong_2 = createElement("strong");
			strong_2.textContent = "1910.134(m)(2)(i)(B)";
			text_9 = createText("\nType of fit test performed;\n\n");
			strong_3 = createElement("strong");
			strong_3.textContent = "1910.134(m)(2)(i)(C)";
			text_11 = createText("\nSpecific make, model, style, and size of respirator tested;\n\n");
			strong_4 = createElement("strong");
			strong_4.textContent = "1910.134(m)(2)(i)(D)";
			text_13 = createText("\nDate of test; and\n\n");
			strong_5 = createElement("strong");
			strong_5.textContent = "1910.134(m)(2)(i)(E)";
			text_15 = createText("\nThe pass/fail results for QLFTs or the fit factor and strip chart recording or other recording of the test results for QNFTs.\n\n");
			strong_6 = createElement("strong");
			strong_6.textContent = "1910.134(m)(2)(ii)";
			text_17 = createText("\nFit test records shall be retained for respirator users until the next fit test is administered.");
			accordion_1._fragment.c();
			text_18 = createText("\n\n");
			text_19 = createText("A written copy of the current respirator program shall be retained by the employer.");
			accordion_2._fragment.c();
			text_20 = createText("\n\n");
			text_21 = createText("Written materials required to be retained under this paragraph shall be made available upon request to affected employees and to the Assistant Secretary or designee for examination and copying.");
			accordion_3._fragment.c();
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			appendNode(text_2, accordion._slotted.default);
			accordion._mount(target, anchor);
			insertNode(text_3, target, anchor);
			appendNode(strong, accordion_1._slotted.default);
			appendNode(text_5, accordion_1._slotted.default);
			appendNode(strong_1, accordion_1._slotted.default);
			appendNode(text_7, accordion_1._slotted.default);
			appendNode(strong_2, accordion_1._slotted.default);
			appendNode(text_9, accordion_1._slotted.default);
			appendNode(strong_3, accordion_1._slotted.default);
			appendNode(text_11, accordion_1._slotted.default);
			appendNode(strong_4, accordion_1._slotted.default);
			appendNode(text_13, accordion_1._slotted.default);
			appendNode(strong_5, accordion_1._slotted.default);
			appendNode(text_15, accordion_1._slotted.default);
			appendNode(strong_6, accordion_1._slotted.default);
			appendNode(text_17, accordion_1._slotted.default);
			accordion_1._mount(target, anchor);
			insertNode(text_18, target, anchor);
			appendNode(text_19, accordion_2._slotted.default);
			accordion_2._mount(target, anchor);
			insertNode(text_20, target, anchor);
			appendNode(text_21, accordion_3._slotted.default);
			accordion_3._mount(target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			accordion._unmount();
			detachNode(text_3);
			accordion_1._unmount();
			detachNode(text_18);
			accordion_2._unmount();
			detachNode(text_20);
			accordion_3._unmount();
		},

		d: function destroy$$1() {
			accordion.destroy(false);
			accordion_1.destroy(false);
			accordion_2.destroy(false);
			accordion_3.destroy(false);
		}
	};
}

function _1910_134m_recordkeeping(options) {
	init(this, options);
	this._state = assign({}, options.data);

	if (!options._root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment$17(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(_1910_134m_recordkeeping.prototype, proto);

/* client/data/content/1910-134n-effective-date.html generated by Svelte v1.41.3 */
function create_main_fragment$18(state, component) {
	var h1, text_1;

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "1910.134(N) EFFECTIVE DATE";
			text_1 = createText("\n\nParagraphs (d)(3)(i)(A) and (d)(3)(i)(B) of this section become effective November 22, 2006.");
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
		},

		d: noop
	};
}

function _1910_134n_effective_date(options) {
	init(this, options);
	this._state = assign({}, options.data);

	this._fragment = create_main_fragment$18(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);
	}
}

assign(_1910_134n_effective_date.prototype, proto);

/* client/data/content/1910-134o-appendices.html generated by Svelte v1.41.3 */
function create_main_fragment$19(state, component) {
	var h1, text_1;

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "1910.134(O) APPENDICES";
			text_1 = createText("\n\nCompliance with Appendix A, Appendix B-1, Appendix B-2, Appendix C, and Appendix D to this section are mandatory.");
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
		},

		d: noop
	};
}

function _1910_134o_appendices(options) {
	init(this, options);
	this._state = assign({}, options.data);

	this._fragment = create_main_fragment$19(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);
	}
}

assign(_1910_134o_appendices.prototype, proto);

/* client/data/content/acronyms.html generated by Svelte v1.41.3 */
function create_main_fragment$20(state, component) {
	var h1, text_1, text_2, text_3, text_4, text_5, text_6, text_7, text_8, text_9, text_10, text_11, text_12, text_13, text_14, text_15, text_16, text_17, text_18, text_19, text_20, text_21, text_22, text_23, text_24, text_25, text_26, text_27, text_28, text_29, text_30, text_31, text_32, text_33, text_34, text_35, text_36, text_37, text_38, text_39, text_40, text_41, text_42, text_43, text_44, text_45, text_46, text_47, text_48, text_49, text_50, text_51, text_52, text_53, text_54, text_55, text_56, text_57, text_58, text_59, text_60, text_61, text_62, text_63, text_64, text_65, text_66, text_67, text_68, text_69, text_70;

	var accordion = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "ACGIH" }
	});

	var accordion_1 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "AIHA" }
	});

	var accordion_2 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "ANSI" }
	});

	var accordion_3 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "APF" }
	});

	var accordion_4 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "APR" }
	});

	var accordion_5 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Ci" }
	});

	var accordion_6 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Co" }
	});

	var accordion_7 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "DFM" }
	});

	var accordion_8 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "DOP" }
	});

	var accordion_9 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "EPF" }
	});

	var accordion_10 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "HEPA" }
	});

	var accordion_11 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "IDLH" }
	});

	var accordion_12 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "LANL" }
	});

	var accordion_13 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "LASL" }
	});

	var accordion_14 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "LLNL" }
	});

	var accordion_15 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "MSHA" }
	});

	var accordion_16 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "MUC" }
	});

	var accordion_17 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "NFPA" }
	});

	var accordion_18 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "NIOSH" }
	});

	var accordion_19 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "NRC" }
	});

	var accordion_20 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "OSHA" }
	});

	var accordion_21 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "OSH Act" }
	});

	var accordion_22 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "PAPR" }
	});

	var accordion_23 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "PEL" }
	});

	var accordion_24 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "PPF" }
	});

	var accordion_25 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "QLFT" }
	});

	var accordion_26 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "QNFT" }
	});

	var accordion_27 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "RDL" }
	});

	var accordion_28 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "REL" }
	});

	var accordion_29 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "SAR" }
	});

	var accordion_30 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "SCBA" }
	});

	var accordion_31 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "SWPF" }
	});

	var accordion_32 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "TLV" }
	});

	var accordion_33 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "TWA" }
	});

	var accordion_34 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "WPF" }
	});

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "Acronyms";
			text_1 = createText("\n\n");
			text_2 = createText("American Conference of Governmental Industrial Hygienists");
			accordion._fragment.c();
			text_3 = createText("\n");
			text_4 = createText("American Industrial Hygiene Association");
			accordion_1._fragment.c();
			text_5 = createText("\n");
			text_6 = createText("American National Standards Institute");
			accordion_2._fragment.c();
			text_7 = createText("\n");
			text_8 = createText("The Assigned Protection Factor (APF) indicates the workplace level of respiratory protection that a respirator or class of respirators is expected to provide to employees when the employer implements a continuing, effective respiratory protection program as specified by this section.");
			accordion_3._fragment.c();
			text_9 = createText("\n");
			text_10 = createText("An air-purifying respirator (APR) is a respirator with an air-purifying filter, cartridge, or canister that removes specific air contaminants by passing ambient air through the air-purifying element.");
			accordion_4._fragment.c();
			text_11 = createText("\n");
			text_12 = createText("Concentration Inside. The concentration measured inside the respirator facepiece");
			accordion_5._fragment.c();
			text_13 = createText("\n");
			text_14 = createText("Concentration Outside. Concentration measured outside the respirator.");
			accordion_6._fragment.c();
			text_15 = createText("\n");
			text_16 = createText("A Dust, Fume, and Mist filter");
			accordion_7._fragment.c();
			text_17 = createText("\n");
			text_18 = createText("Dioctylphthalate, which is an aerosolized agent used for quantitative fit testing.");
			accordion_8._fragment.c();
			text_19 = createText("\n");
			text_20 = createText("A Effective Protection Factor (EPF) study is a study, conducted in the workplace, that measures the protection provided by a properly selected, fit-tested, and functioning respirator when used intermittently for only some fraction of the total workplace exposure time (i.e., sampling is conducted during periods when respirators are worn and not worn). EPFs are not directly comparable to Workplace Protection Factor (WPF) values because the determinations include both the time spent in contaminated atmospheres with and without respiratory protection; therefore, EPFs usually underestimate the protection afforded by a respirator that is used continuously in the workplace.");
			accordion_9._fragment.c();
			text_21 = createText("\n");
			text_22 = createText("A High Efficiency Particulate Air (HEPA) filter is a filter that is at least 99.97% efficient in removing monodispersed particles of 0.3 micrometers in diameter. The equivalent NIOSH 42 CFR 84 particulate filters are the N100, R100, and P100 filters.");
			accordion_10._fragment.c();
			text_23 = createText("\n");
			text_24 = createText("Immediately Dangerous to Life or Health. An atmosphere that poses an immediate threat to life, would cause irreversible adverse health effects, or would impair an individual’s ability to escape from a dangerous atmosphere.");
			accordion_11._fragment.c();
			text_25 = createText("\n");
			text_26 = createText("Los Alamos National Laboratory");
			accordion_12._fragment.c();
			text_27 = createText("\n");
			text_28 = createText("Los Alamos Scientific Laboratory");
			accordion_13._fragment.c();
			text_29 = createText("\n");
			text_30 = createText("Lawrence Livermore National Laboratory");
			accordion_14._fragment.c();
			text_31 = createText("\n");
			text_32 = createText("Mine Safety and Health Administration");
			accordion_15._fragment.c();
			text_33 = createText("\n");
			text_34 = createText("Maximum Use Concentration (MUC) is the maximum atmospheric concentration of a hazardous substance from which an employee can be expected to be protected when wearing a respirator, and is determined by the assigned protection factor of the respirator or class of respirators and the exposure limit of the hazardous substance. The MUC can be determined mathematically by multiplying the assigned protection factor specified for a respirator by the required OSHA permissible exposure limit, short-term exposure limit, or ceiling limit. When no OSHA exposure limit is available for a hazardous substance, an employer must determine an MUC on the basis of relevant available information and informed professional judgment.");
			accordion_16._fragment.c();
			text_35 = createText("\n");
			text_36 = createText("National Fire Protection Association");
			accordion_17._fragment.c();
			text_37 = createText("\n");
			text_38 = createText("National Institute for Occupational Safety and Health");
			accordion_18._fragment.c();
			text_39 = createText("\n");
			text_40 = createText("Nuclear Regulatory Commission");
			accordion_19._fragment.c();
			text_41 = createText("\n");
			text_42 = createText("Occupational Safety and Health Administration");
			accordion_20._fragment.c();
			text_43 = createText("\n");
			text_44 = createText("The Occupational Safety and Health Act of 1970 (29 U.S.C. 655, 657, 665).");
			accordion_21._fragment.c();
			text_45 = createText("\n");
			text_46 = createText("A Powered Air-Purifying Respirator (PARP) is an air-purifying respirator that uses a blower to force the ambient air through air-purifying elements to the inlet covering.");
			accordion_22._fragment.c();
			text_47 = createText("\n");
			text_48 = createText("Permissible Exposure Limit. An occupational exposure limit specified by OSHA.");
			accordion_23._fragment.c();
			text_49 = createText("\n");
			text_50 = createText("A Program Protection Factor (PPF) study is a study that determines the protection provided by a respirator during use. This determination generally is accomplished by measuring the ratio of the concentration of an airborne contaminant (e.g., hazardous substance) outside the respirator (Co) to the concentration inside the respirator (Ci) (i.e., Co/Ci). Therefore, as the ratio between Co and Ci increases, the protection factor increases, indicating an increase in the level of protection provided to employees by the respirator. There are four types of protection factor studies: EPF, PPF, WPF, and SWPF.");
			accordion_24._fragment.c();
			text_51 = createText("\n");
			text_52 = createText("A Qualitative Fit Test (QLFT) is a pass/fail fit test to assess the adequacy of respirator fit that relies on the individual’s response to the test agent.");
			accordion_25._fragment.c();
			text_53 = createText("\n");
			text_54 = createText("A Quantitative Fit Test (QNFT) is an assessment of the adequacy of respirator fit by numerically measuring the amount of leakage into the respirator.");
			accordion_26._fragment.c();
			text_55 = createText("\n");
			text_56 = createText("Respirator Decision Logic. Respirator selection guidance developed by NIOSH that contains a set of respirator protection factors.");
			accordion_27._fragment.c();
			text_57 = createText("\n");
			text_58 = createText("Recommended Exposure Limit. An occupational exposure level recommended by NIOSH.");
			accordion_28._fragment.c();
			text_59 = createText("\n");
			text_60 = createText("A Supplied-Air (or Airline) Respirator (SAR) is an atmosphere-supplying respirator for which the source of breathing air is not designed to be carried by the user.");
			accordion_29._fragment.c();
			text_61 = createText("\n");
			text_62 = createText("A Self-Contained Breathing Apparatus (SCBA) is an atmosphere- supplying respirator for which the breathing air source is designed to be carried by the user.");
			accordion_30._fragment.c();
			text_63 = createText("\n");
			text_64 = createText("A Simulated Workplace Protection Factor (SWPF) study is a study, conducted in a controlled laboratory setting and in which Co and Ci sampling is performed while the respirator user performs a series of set exercises. The laboratory setting is used to control many of the variables found in workplace studies, while the exercises simulate the work activities of respirator users. This type of study is designed to determine the optimum performance of respirators by reducing the impact of sources of variability through maintenance of tightly controlled study conditions.");
			accordion_31._fragment.c();
			text_65 = createText("\n");
			text_66 = createText("Threshold Limit Value. An occupational exposure level recommended by ACGIH.");
			accordion_32._fragment.c();
			text_67 = createText("\n");
			text_68 = createText("Time-Weighted Average is used to measure a worker's daily exposure to hazardous substances, averaged on an 8-hour workday. The average is calculated from air samples throughout a work cycle and the amount of time spent working in those conditions. OSHA uses TWAs to establish Permissible Exposure Limits for the contaminants encountered in industries.\nThe TWA is calculated in units of parts per million (ppm) or mg/m3.");
			accordion_33._fragment.c();
			text_69 = createText("\n");
			text_70 = createText("A Workplace Protection Factor (WPF) study is a study, conducted under actual conditions of use in the workplace, that measures the protection provided by a properly selected, fit-tested, and functioning respirator, when the respirator is worn correctly and used as part of a comprehensive respirator program that is in compliance with OSHA’s Respiratory Protection standard at 29 CFR 1910.134. Measurements of Co and Ci are obtained only while the respirator is being worn during performance of normal work tasks (i.e., samples are not collected when the respirator is not being worn). As the degree of protection afforded by the respirator increases, the WPF increases.");
			accordion_34._fragment.c();
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			appendNode(text_2, accordion._slotted.default);
			accordion._mount(target, anchor);
			insertNode(text_3, target, anchor);
			appendNode(text_4, accordion_1._slotted.default);
			accordion_1._mount(target, anchor);
			insertNode(text_5, target, anchor);
			appendNode(text_6, accordion_2._slotted.default);
			accordion_2._mount(target, anchor);
			insertNode(text_7, target, anchor);
			appendNode(text_8, accordion_3._slotted.default);
			accordion_3._mount(target, anchor);
			insertNode(text_9, target, anchor);
			appendNode(text_10, accordion_4._slotted.default);
			accordion_4._mount(target, anchor);
			insertNode(text_11, target, anchor);
			appendNode(text_12, accordion_5._slotted.default);
			accordion_5._mount(target, anchor);
			insertNode(text_13, target, anchor);
			appendNode(text_14, accordion_6._slotted.default);
			accordion_6._mount(target, anchor);
			insertNode(text_15, target, anchor);
			appendNode(text_16, accordion_7._slotted.default);
			accordion_7._mount(target, anchor);
			insertNode(text_17, target, anchor);
			appendNode(text_18, accordion_8._slotted.default);
			accordion_8._mount(target, anchor);
			insertNode(text_19, target, anchor);
			appendNode(text_20, accordion_9._slotted.default);
			accordion_9._mount(target, anchor);
			insertNode(text_21, target, anchor);
			appendNode(text_22, accordion_10._slotted.default);
			accordion_10._mount(target, anchor);
			insertNode(text_23, target, anchor);
			appendNode(text_24, accordion_11._slotted.default);
			accordion_11._mount(target, anchor);
			insertNode(text_25, target, anchor);
			appendNode(text_26, accordion_12._slotted.default);
			accordion_12._mount(target, anchor);
			insertNode(text_27, target, anchor);
			appendNode(text_28, accordion_13._slotted.default);
			accordion_13._mount(target, anchor);
			insertNode(text_29, target, anchor);
			appendNode(text_30, accordion_14._slotted.default);
			accordion_14._mount(target, anchor);
			insertNode(text_31, target, anchor);
			appendNode(text_32, accordion_15._slotted.default);
			accordion_15._mount(target, anchor);
			insertNode(text_33, target, anchor);
			appendNode(text_34, accordion_16._slotted.default);
			accordion_16._mount(target, anchor);
			insertNode(text_35, target, anchor);
			appendNode(text_36, accordion_17._slotted.default);
			accordion_17._mount(target, anchor);
			insertNode(text_37, target, anchor);
			appendNode(text_38, accordion_18._slotted.default);
			accordion_18._mount(target, anchor);
			insertNode(text_39, target, anchor);
			appendNode(text_40, accordion_19._slotted.default);
			accordion_19._mount(target, anchor);
			insertNode(text_41, target, anchor);
			appendNode(text_42, accordion_20._slotted.default);
			accordion_20._mount(target, anchor);
			insertNode(text_43, target, anchor);
			appendNode(text_44, accordion_21._slotted.default);
			accordion_21._mount(target, anchor);
			insertNode(text_45, target, anchor);
			appendNode(text_46, accordion_22._slotted.default);
			accordion_22._mount(target, anchor);
			insertNode(text_47, target, anchor);
			appendNode(text_48, accordion_23._slotted.default);
			accordion_23._mount(target, anchor);
			insertNode(text_49, target, anchor);
			appendNode(text_50, accordion_24._slotted.default);
			accordion_24._mount(target, anchor);
			insertNode(text_51, target, anchor);
			appendNode(text_52, accordion_25._slotted.default);
			accordion_25._mount(target, anchor);
			insertNode(text_53, target, anchor);
			appendNode(text_54, accordion_26._slotted.default);
			accordion_26._mount(target, anchor);
			insertNode(text_55, target, anchor);
			appendNode(text_56, accordion_27._slotted.default);
			accordion_27._mount(target, anchor);
			insertNode(text_57, target, anchor);
			appendNode(text_58, accordion_28._slotted.default);
			accordion_28._mount(target, anchor);
			insertNode(text_59, target, anchor);
			appendNode(text_60, accordion_29._slotted.default);
			accordion_29._mount(target, anchor);
			insertNode(text_61, target, anchor);
			appendNode(text_62, accordion_30._slotted.default);
			accordion_30._mount(target, anchor);
			insertNode(text_63, target, anchor);
			appendNode(text_64, accordion_31._slotted.default);
			accordion_31._mount(target, anchor);
			insertNode(text_65, target, anchor);
			appendNode(text_66, accordion_32._slotted.default);
			accordion_32._mount(target, anchor);
			insertNode(text_67, target, anchor);
			appendNode(text_68, accordion_33._slotted.default);
			accordion_33._mount(target, anchor);
			insertNode(text_69, target, anchor);
			appendNode(text_70, accordion_34._slotted.default);
			accordion_34._mount(target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			accordion._unmount();
			detachNode(text_3);
			accordion_1._unmount();
			detachNode(text_5);
			accordion_2._unmount();
			detachNode(text_7);
			accordion_3._unmount();
			detachNode(text_9);
			accordion_4._unmount();
			detachNode(text_11);
			accordion_5._unmount();
			detachNode(text_13);
			accordion_6._unmount();
			detachNode(text_15);
			accordion_7._unmount();
			detachNode(text_17);
			accordion_8._unmount();
			detachNode(text_19);
			accordion_9._unmount();
			detachNode(text_21);
			accordion_10._unmount();
			detachNode(text_23);
			accordion_11._unmount();
			detachNode(text_25);
			accordion_12._unmount();
			detachNode(text_27);
			accordion_13._unmount();
			detachNode(text_29);
			accordion_14._unmount();
			detachNode(text_31);
			accordion_15._unmount();
			detachNode(text_33);
			accordion_16._unmount();
			detachNode(text_35);
			accordion_17._unmount();
			detachNode(text_37);
			accordion_18._unmount();
			detachNode(text_39);
			accordion_19._unmount();
			detachNode(text_41);
			accordion_20._unmount();
			detachNode(text_43);
			accordion_21._unmount();
			detachNode(text_45);
			accordion_22._unmount();
			detachNode(text_47);
			accordion_23._unmount();
			detachNode(text_49);
			accordion_24._unmount();
			detachNode(text_51);
			accordion_25._unmount();
			detachNode(text_53);
			accordion_26._unmount();
			detachNode(text_55);
			accordion_27._unmount();
			detachNode(text_57);
			accordion_28._unmount();
			detachNode(text_59);
			accordion_29._unmount();
			detachNode(text_61);
			accordion_30._unmount();
			detachNode(text_63);
			accordion_31._unmount();
			detachNode(text_65);
			accordion_32._unmount();
			detachNode(text_67);
			accordion_33._unmount();
			detachNode(text_69);
			accordion_34._unmount();
		},

		d: function destroy$$1() {
			accordion.destroy(false);
			accordion_1.destroy(false);
			accordion_2.destroy(false);
			accordion_3.destroy(false);
			accordion_4.destroy(false);
			accordion_5.destroy(false);
			accordion_6.destroy(false);
			accordion_7.destroy(false);
			accordion_8.destroy(false);
			accordion_9.destroy(false);
			accordion_10.destroy(false);
			accordion_11.destroy(false);
			accordion_12.destroy(false);
			accordion_13.destroy(false);
			accordion_14.destroy(false);
			accordion_15.destroy(false);
			accordion_16.destroy(false);
			accordion_17.destroy(false);
			accordion_18.destroy(false);
			accordion_19.destroy(false);
			accordion_20.destroy(false);
			accordion_21.destroy(false);
			accordion_22.destroy(false);
			accordion_23.destroy(false);
			accordion_24.destroy(false);
			accordion_25.destroy(false);
			accordion_26.destroy(false);
			accordion_27.destroy(false);
			accordion_28.destroy(false);
			accordion_29.destroy(false);
			accordion_30.destroy(false);
			accordion_31.destroy(false);
			accordion_32.destroy(false);
			accordion_33.destroy(false);
			accordion_34.destroy(false);
		}
	};
}

function Acronyms(options) {
	init(this, options);
	this._state = assign({}, options.data);

	if (!options._root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment$20(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(Acronyms.prototype, proto);

/* client/data/content/before-you-start.html generated by Svelte v1.41.3 */
function create_main_fragment$21(state, component) {
	var h1, text_1, ol, text_4, img, text_5, ul;

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "Before You Start";
			text_1 = createText("\n\nBefore using the selection tool, you need:\n");
			ol = createElement("ol");
			ol.innerHTML = "<li>The name of the contaminant. The search function uses chemical names, CAS numbers, or RTECS numbers.</li>\n \t<li>The latest time-weighted average (TWA) of the contaminant at your worksite.</li>\n";
			text_4 = createText("\n");
			img = createElement("img");
			text_5 = createText("\n\nThe selection tool will provide data about the contaminant’s properties. This data is drawn from the NIOSH Pocket Guide to Chemical Hazards and OSHA Tables Z-1, Z-2, or Z-3. Data includes:\n");
			ul = createElement("ul");
			ul.innerHTML = "<li>Synonyms</li>\n \t<li>Immediately dangerous to life or health (IDLH) concentration levels</li>\n \t<li>Exposure Limits (PELs, RELs, STELs, Ceiling Limits)</li>\n \t<li>Eye and Skin Hazards</li>\n";
			this.h();
		},

		h: function hydrate() {
			img.src = "wp-images/7023032415_4c2b68820c_z-1-300x208.jpg";
			img.alt = '';
			img.width = "300";
			img.height = "208";
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			insertNode(ol, target, anchor);
			insertNode(text_4, target, anchor);
			insertNode(img, target, anchor);
			insertNode(text_5, target, anchor);
			insertNode(ul, target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			detachNode(ol);
			detachNode(text_4);
			detachNode(img);
			detachNode(text_5);
			detachNode(ul);
		},

		d: noop
	};
}

function Before_you_start(options) {
	init(this, options);
	this._state = assign({}, options.data);

	this._fragment = create_main_fragment$21(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);
	}
}

assign(Before_you_start.prototype, proto);

/* client/data/content/caring-for-your-respirator.html generated by Svelte v1.41.3 */
function create_main_fragment$22(state, component) {
	var h1, text_1, text_2, text_3, text_4, text_5, text_6, text_7, text_8, text_9, text_10, text_11, text_12;

	var accordion = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Caring for your respirator" }
	});

	var accordion_1 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Employer" }
	});

	var accordion_2 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Regular care" }
	});

	var accordion_3 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Damage" }
	});

	var accordion_4 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Storage" }
	});

	var accordion_5 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Changing filters" }
	});

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "Caring For Your Respirator";
			text_1 = createText("\n\n");
			text_2 = createText("Respirator care is a vital part of any respiratory protection program. Regularly caring for your respirator ensures that it is always in good working condition and capable of offering the protection you need for your job.");
			accordion._fragment.c();
			text_3 = createText("\n\n");
			text_4 = createText("Employers are required to establish procedures and regular maintenance schedules for the care of all respirators used by their employees (unless they are voluntary respirators). This includes procedures for the cleaning, storing, inspecting, and repairing or disposing of respirators.\nCare must always be done in accordance with OSHA requirements, but manufacturers’ directions should also be considered, as there may be cleaning solutions that should not be used on certain types of respirators.");
			accordion_1._fragment.c();
			text_5 = createText("\n\n");
			text_6 = createText("Respirators should always be inspected for damage before and after use. Pay particular attention to:\nBasic functionality (user fit test)\nConnections (check tightness)\nFacepiece\nHead straps\nValves\nTubes\nHoses\nAny cartridges, canisters, or filters\nElastomeric parts (check for pliability, signs of deterioration)");
			accordion_2._fragment.c();
			text_7 = createText("\n\n");
			text_8 = createText("Remove any damaged respirators form use to either be discarded or repaired by a trained person. If your respirator fails an inspection or is defective, your employer must remove it from service and either repair it or discard it. Repairs must be made according to the respirator manufacturer's instructions and must use only NIOSH-approved parts that are designed for the respirator.");
			accordion_3._fragment.c();
			text_9 = createText("\n\n");
			text_10 = createText("It is important for respirators to be stored properly to protect them from damage or contamination. Sunlight, extreme temperatures, excessive moisture, and some chemicals can all damage respirators. Always store your respirator in a way that prevents deforming the facepiece or exhalation valve. Never leave your respirator hanging on a machine, lying on your workbench, tucked into your pocket, or tossed into your toolbox or a drawer.");
			accordion_4._fragment.c();
			text_11 = createText("\n\n");
			text_12 = createText("Always change filters on schedule. If you use a respirator for protection against gases and vapors, your employer must determine a schedule for replacing worn out cartridges or canisters. This is known as a \"change-out schedule.\" Your employer is responsible for providing this information to you, so that you know when a cartridge or canister must be changed.");
			accordion_5._fragment.c();
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			appendNode(text_2, accordion._slotted.default);
			accordion._mount(target, anchor);
			insertNode(text_3, target, anchor);
			appendNode(text_4, accordion_1._slotted.default);
			accordion_1._mount(target, anchor);
			insertNode(text_5, target, anchor);
			appendNode(text_6, accordion_2._slotted.default);
			accordion_2._mount(target, anchor);
			insertNode(text_7, target, anchor);
			appendNode(text_8, accordion_3._slotted.default);
			accordion_3._mount(target, anchor);
			insertNode(text_9, target, anchor);
			appendNode(text_10, accordion_4._slotted.default);
			accordion_4._mount(target, anchor);
			insertNode(text_11, target, anchor);
			appendNode(text_12, accordion_5._slotted.default);
			accordion_5._mount(target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			accordion._unmount();
			detachNode(text_3);
			accordion_1._unmount();
			detachNode(text_5);
			accordion_2._unmount();
			detachNode(text_7);
			accordion_3._unmount();
			detachNode(text_9);
			accordion_4._unmount();
			detachNode(text_11);
			accordion_5._unmount();
		},

		d: function destroy$$1() {
			accordion.destroy(false);
			accordion_1.destroy(false);
			accordion_2.destroy(false);
			accordion_3.destroy(false);
			accordion_4.destroy(false);
			accordion_5.destroy(false);
		}
	};
}

function Caring_for_your_respirator(options) {
	init(this, options);
	this._state = assign({}, options.data);

	if (!options._root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment$22(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(Caring_for_your_respirator.prototype, proto);

/* client/data/content/conversion-tables.html generated by Svelte v1.41.3 */
function create_main_fragment$23(state, component) {
	var h1, text_1;

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "Conversion Tables";
			text_1 = createText("\n\nPEL x APF = MUC\nTWA:\n(xppm)(xhours) + (xppm)(xhours)… = ttl ppm = TWAppm/8hours\nttl hours\n\nTWA equation: TWA= (t1c1+t2c2+…+tncn) / (t1+t2+…+tn)\n\nt=time of exposure\nc= concentration level during the time period\nThe TWA is calculated in units of parts per million (ppm) or mg/m3.");
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
		},

		d: noop
	};
}

function Conversion_tables(options) {
	init(this, options);
	this._state = assign({}, options.data);

	this._fragment = create_main_fragment$23(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);
	}
}

assign(Conversion_tables.prototype, proto);

/* client/data/content/employer-responsibilites.html generated by Svelte v1.41.3 */
function create_main_fragment$24(state, component) {
	var h1, text_1, ul, text_10, a, text_12;

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "Employer Responsibilites";
			text_1 = createText("\n\n");
			ul = createElement("ul");
			ul.innerHTML = "<li>The standard requires your employer to do the following:\ndevelop and implement a written respiratory protection program</li>\n \t<li>evaluate the respiratory hazards in the workplace</li>\n \t<li>select and provide appropriate respirators</li>\n \t<li>provide worker medical evaluations and respirator fit testing</li>\n \t<li>provide for the maintenance, storage and cleaning of respirators</li>\n \t<li>provide worker training about respiratory hazards and proper respirator use</li>\n \t<li>evaluate workers' use of respirators and correct any problems</li>\n \t<li>provide you with access to specific records and documents, such as a written copy of your employer's respiratory protection program</li>\n";
			text_10 = createText("\n(");
			a = createElement("a");
			a.textContent = "https://www.osha.gov/video/respiratory_protection/construction_transcript.html";
			text_12 = createText(")");
			this.h();
		},

		h: function hydrate() {
			a.href = "https://www.osha.gov/video/respiratory_protection/construction_transcript.html";
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			insertNode(ul, target, anchor);
			insertNode(text_10, target, anchor);
			insertNode(a, target, anchor);
			insertNode(text_12, target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			detachNode(ul);
			detachNode(text_10);
			detachNode(a);
			detachNode(text_12);
		},

		d: noop
	};
}

function Employer_responsibilites(options) {
	init(this, options);
	this._state = assign({}, options.data);

	this._fragment = create_main_fragment$24(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);
	}
}

assign(Employer_responsibilites.prototype, proto);

/* client/data/content/fit-testing.html generated by Svelte v1.41.3 */
function create_main_fragment$25(state, component) {
	var h1, text_1, text_2, ul, text_5, u, text_7, u_1, text_9, u_2, text_11, text_12, text_13, u_3, text_15, text_16, text_17, text_18, u_4, text_20, ul_1, text_25, text_26, u_5, text_28, u_6, text_30, u_7, text_32, u_8, text_34;

	var accordion = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Overview" }
	});

	var accordion_1 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Quantitative fit test (QNFT)" }
	});

	var accordion_2 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Qualitative fit test (QLFT)" }
	});

	var accordion_3 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "When to fit-test" }
	});

	var accordion_4 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Fit Testing Atmosphere- Supplying Respirators"
		}
	});

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "Fit-Testing";
			text_1 = createText("\n\n");
			text_2 = createText("There are two kinds of fit-testing:\n");
			ul = createElement("ul");
			ul.innerHTML = "<li>Qualitative</li>\n \t<li>Quantitative</li>\n";
			text_5 = createText("\nFit testing is used to determine how well a respirator “fits”—that is, whether the respirator forms a seal on the user’s face. If there’s not a good facepiece-to-face seal, the respirator will provide a lower level of protection than it was rated for. The ");
			u = createElement("u");
			u.textContent = "APFs";
			text_7 = createText(" only apply if the respirators are properly selected and used in compliance with the full respirator program, including initial fit testing. Fit testing must be performed before initial use and then at least once a year. ");
			u_1 = createElement("u");
			u_1.textContent = "The Respiratory Protection standard";
			text_9 = createText(" requires employers to conduct fit testing on all employees who are required to wear a respirator that includes a ");
			u_2 = createElement("u");
			u_2.textContent = "tight-fitting";
			text_11 = createText(" facepiece.");
			accordion._fragment.c();
			text_12 = createText("\n\n");
			text_13 = createText("Quantitative fit testing is a method of measuring the amount of leakage into a respirator. It is a numeric assessment of how well a respirator fits a particular individual. To quantitatively fit test a respirator, sampling probes or other measuring devices must be placed to measure aerosol concentrations both outside and on the inside of the respirator facepiece. The respirator wearer then performs the usual ");
			u_3 = createElement("u");
			u_3.textContent = "user seal checks.";
			accordion_1._fragment.c();
			text_15 = createText("\n\n");
			text_16 = createText("Qualitative fit testing is a pass/fail test that relies on the respirator wearer’s response to a substance (“test agent”) used in the test to determine respirator fit.In qualitative fit testing, after performing user seal checks, the respirator wearer stands in an enclosure and a test agent is introduced.If the individual can detect the test agent, this indicates that the agent leaked into the facepiece and that the respirator has failed the test because a good facepiece-to- face seal has not been achieved.");
			accordion_2._fragment.c();
			text_17 = createText("\n\n");
			text_18 = createText("Fit testing must be conducted for all employees required to wear ");
			u_4 = createElement("u");
			u_4.textContent = "tight-fitting";
			text_20 = createText(" facepiece respirators as follows:\n");
			ul_1 = createElement("ul");
			ul_1.innerHTML = "<li>Prior to initial use.</li>\n \t<li>Whenever an employee switches to a different tightfitting facepiece respirator (for example, a different size, make or model).</li>\n \t<li>At least annually.</li>\n";
			accordion_3._fragment.c();
			text_25 = createText("\n");
			text_26 = createText("All fit testing conducted for ");
			u_5 = createElement("u");
			u_5.textContent = "tight-fitting atmosphere-supplying respirators";
			text_28 = createText(" and ");
			u_6 = createElement("u");
			u_6.textContent = "powered air-purifying respirators";
			text_30 = createText(" must be conducted in the ");
			u_7 = createElement("u");
			u_7.textContent = "negative pressure";
			text_32 = createText(" mode, even if the respirator will be used with ");
			u_8 = createElement("u");
			u_8.textContent = "positive";
			text_34 = createText(" pressure. This is because it is difficult outside of a laboratory test situation to accurately perform fit testing on positive pressure respirators.");
			accordion_4._fragment.c();
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			appendNode(text_2, accordion._slotted.default);
			appendNode(ul, accordion._slotted.default);
			appendNode(text_5, accordion._slotted.default);
			appendNode(u, accordion._slotted.default);
			appendNode(text_7, accordion._slotted.default);
			appendNode(u_1, accordion._slotted.default);
			appendNode(text_9, accordion._slotted.default);
			appendNode(u_2, accordion._slotted.default);
			appendNode(text_11, accordion._slotted.default);
			accordion._mount(target, anchor);
			insertNode(text_12, target, anchor);
			appendNode(text_13, accordion_1._slotted.default);
			appendNode(u_3, accordion_1._slotted.default);
			accordion_1._mount(target, anchor);
			insertNode(text_15, target, anchor);
			appendNode(text_16, accordion_2._slotted.default);
			accordion_2._mount(target, anchor);
			insertNode(text_17, target, anchor);
			appendNode(text_18, accordion_3._slotted.default);
			appendNode(u_4, accordion_3._slotted.default);
			appendNode(text_20, accordion_3._slotted.default);
			appendNode(ul_1, accordion_3._slotted.default);
			accordion_3._mount(target, anchor);
			insertNode(text_25, target, anchor);
			appendNode(text_26, accordion_4._slotted.default);
			appendNode(u_5, accordion_4._slotted.default);
			appendNode(text_28, accordion_4._slotted.default);
			appendNode(u_6, accordion_4._slotted.default);
			appendNode(text_30, accordion_4._slotted.default);
			appendNode(u_7, accordion_4._slotted.default);
			appendNode(text_32, accordion_4._slotted.default);
			appendNode(u_8, accordion_4._slotted.default);
			appendNode(text_34, accordion_4._slotted.default);
			accordion_4._mount(target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			accordion._unmount();
			detachNode(text_12);
			accordion_1._unmount();
			detachNode(text_15);
			accordion_2._unmount();
			detachNode(text_17);
			accordion_3._unmount();
			detachNode(text_25);
			accordion_4._unmount();
		},

		d: function destroy$$1() {
			accordion.destroy(false);
			accordion_1.destroy(false);
			accordion_2.destroy(false);
			accordion_3.destroy(false);
			accordion_4.destroy(false);
		}
	};
}

function Fit_testing(options) {
	init(this, options);
	this._state = assign({}, options.data);

	if (!options._root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment$25(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(Fit_testing.prototype, proto);

/* client/data/content/glossary.html generated by Svelte v1.41.3 */
function create_main_fragment$26(state, component) {
	var h1, text_1, text_2, text_3, text_4, text_5, text_6, text_7, text_8, text_9, text_10, text_11, text_12, text_13, text_14, text_15, text_16, text_17, text_18, text_19, text_20, text_21, text_22, text_23, text_24, text_25, text_26, text_27, text_28, text_29, text_30, text_31, text_32, text_33, text_34, text_35, text_36, text_37, text_38, text_39, text_40, text_41, text_42, text_43, text_44, text_45, text_46, text_47, text_48, text_49, text_50, text_51, text_52, text_53, text_54, text_55, text_56, text_57, text_58, text_59, text_60, text_61, text_62, text_63, text_64, text_65, text_66, text_67, text_68, text_69, text_70, text_71, text_72, text_73, text_74, text_75, text_76, text_77, text_78, text_79, text_80, text_81, text_82, text_83, text_84, text_85, text_86, text_87, text_88, text_89, text_90, text_91, text_92;

	var accordion = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Air-purifying respirator (APR)" }
	});

	var accordion_1 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Assigned protection factor (APF)"
		}
	});

	var accordion_2 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Atmosphere-supplying respirator (ASR)"
		}
	});

	var accordion_3 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Canister or cartridge" }
	});

	var accordion_4 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Continuous flow respirator" }
	});

	var accordion_5 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Demand respirator" }
	});

	var accordion_6 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Dioctylphthalate (DOP)" }
	});

	var accordion_7 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Elastomeric" }
	});

	var accordion_8 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Emergency situation" }
	});

	var accordion_9 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Employee exposure" }
	});

	var accordion_10 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "End-of-service-life indicator (ESLI)"
		}
	});

	var accordion_11 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Escape-only respirator" }
	});

	var accordion_12 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Filter or air-purifying element" }
	});

	var accordion_13 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Filtering facepiece (or dust mask)"
		}
	});

	var accordion_14 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Fit factor" }
	});

	var accordion_15 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Fit test" }
	});

	var accordion_16 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Helmet" }
	});

	var accordion_17 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "High-efficiency particulate air filter (HEPA)"
		}
	});

	var accordion_18 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Hood" }
	});

	var accordion_19 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Immediately dangerous to life or health (IDLH)"
		}
	});

	var accordion_20 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Interior structural firefighting"
		}
	});

	var accordion_21 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Loose-fitting facepiece" }
	});

	var accordion_22 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Maximum use concentration (MUC)" }
	});

	var accordion_23 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Negative pressure respirator (tight-fitting)"
		}
	});

	var accordion_24 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Oxygen deficient atmosphere" }
	});

	var accordion_25 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Permissible Exposure Limit (PEL)"
		}
	});

	var accordion_26 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Physician or other licensed healthcare professional (PLHCP)"
		}
	});

	var accordion_27 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Positive pressure respirator" }
	});

	var accordion_28 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Powered air-purifying respirator (PAPR)"
		}
	});

	var accordion_29 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Pressure demand respirator" }
	});

	var accordion_30 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Protection factor study" }
	});

	var accordion_31 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Effective Protection Factor (EPF) study"
		}
	});

	var accordion_32 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Program Protection Factor (PPF) study"
		}
	});

	var accordion_33 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Workplace Protection Factor (WPF) study"
		}
	});

	var accordion_34 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Simulated Workplace Protection Factor (SWPF) study"
		}
	});

	var accordion_35 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Qualitative fit test (QLFT)" }
	});

	var accordion_36 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Quantitative fit test (QNFT)" }
	});

	var accordion_37 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Recommended Exposure Limit (REL)"
		}
	});

	var accordion_38 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Respirator Decision Logic (RDL)" }
	});

	var accordion_39 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Respiratory inlet covering" }
	});

	var accordion_40 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Self-contained breathing apparatus (SCBA)"
		}
	});

	var accordion_41 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Supplied-air respirator (or airline) respirator (SAR)"
		}
	});

	var accordion_42 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Threshold Limit Value (TLV)" }
	});

	var accordion_43 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Tight-fitting facepiece" }
	});

	var accordion_44 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Time-weighted average (TWA)" }
	});

	var accordion_45 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "User seal check" }
	});

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "Glossary";
			text_1 = createText("\n\n");
			text_2 = createText("A respirator with an air-purifying filter, cartridge, or canister that removes specific air contaminants by passing ambient air through the air-purifying element.");
			accordion._fragment.c();
			text_3 = createText("\n\n");
			text_4 = createText("An assigned protection factor indicates the workplace level of respiratory protection that a respirator or class of respirators is expected to provide to employees when the employer implements a continuing, effective respiratory protection program as specified by this section.");
			accordion_1._fragment.c();
			text_5 = createText("\n\n");
			text_6 = createText("A respirator that supplies the respirator user with breathing air from a source independent of the ambient atmosphere, and includes SARs and SCBA units.");
			accordion_2._fragment.c();
			text_7 = createText("\n\n");
			text_8 = createText("A container with a filter, sorbent, or catalyst, or combination of these items, which removes specific contaminants from the air passed through the container.");
			accordion_3._fragment.c();
			text_9 = createText("\n\n");
			text_10 = createText("An atmosphere-supplying respirator that provides a continuous flow of breathable air to the respirator facepiece.");
			accordion_4._fragment.c();
			text_11 = createText("\n\n");
			text_12 = createText("An atmosphere-supplying respirator that admits breathing air to the facepiece only when a negative pressure is created inside the facepiece by inhalation.");
			accordion_5._fragment.c();
			text_13 = createText("\n\n");
			text_14 = createText("An aerosolized agent used for quantitative fit testing.");
			accordion_6._fragment.c();
			text_15 = createText("\n\n");
			text_16 = createText("A respirator facepiece made of a natural or synthetic elastic material such as natural rubber, silicone, or synthetic rubber.");
			accordion_7._fragment.c();
			text_17 = createText("\n\n");
			text_18 = createText("Any occurrence such as, but not limited to, equipment failure, rupture of containers, or failure of control equipment that may or does result in an uncontrolled significant release of an airborne contaminant.");
			accordion_8._fragment.c();
			text_19 = createText("\n\n");
			text_20 = createText("Exposure to a concentration of an airborne contaminant that would occur if the employee were not using respiratory protection.");
			accordion_9._fragment.c();
			text_21 = createText("\n\n");
			text_22 = createText("A system that warns the respirator user of the approach of the end of adequate respiratory protection, for example, that the sorbent is approaching saturation or is no longer effective.");
			accordion_10._fragment.c();
			text_23 = createText("\n\n");
			text_24 = createText("A respirator intended to be used only for emergency exit.");
			accordion_11._fragment.c();
			text_25 = createText("\n\n");
			text_26 = createText("A component used in respirators to remove solid or liquid aerosols from the inspired air.");
			accordion_12._fragment.c();
			text_27 = createText("\n\n");
			text_28 = createText("A negative pressure particulate respirator with a filter as an integral part of the facepiece or with the entire facepiece composed of the filtering medium.");
			accordion_13._fragment.c();
			text_29 = createText("\n\n");
			text_30 = createText("A quantitative estimate of the fit of a particular respirator to a specific individual, and typically estimates the ratio of the concentration of a substance in ambient air to its concentration inside the respirator when worn.");
			accordion_14._fragment.c();
			text_31 = createText("\n\n");
			text_32 = createText("The use of a protocol to qualitatively or quantitatively evaluate the fit of a respirator on an individual.");
			accordion_15._fragment.c();
			text_33 = createText("\n\n");
			text_34 = createText("A rigid respiratory inlet covering that also provides head protection against impact and penetration.");
			accordion_16._fragment.c();
			text_35 = createText("\n\n");
			text_36 = createText("A filter that is at least 99.97% efficient in removing monodispersed particles of 0.3 micrometers in diameter. The equivalent NIOSH 42 CFR 84 particulate filters are the N100, R100, and P100 filters.");
			accordion_17._fragment.c();
			text_37 = createText("\n\n");
			text_38 = createText("A respiratory inlet covering that completely covers the head and neck and may also cover portions of the shoulders and torso.");
			accordion_18._fragment.c();
			text_39 = createText("\n\n");
			text_40 = createText("An atmosphere that poses an immediate threat to life, would cause irreversible adverse health effects, or would impair an individual’s ability to escape from a dangerous atmosphere.");
			accordion_19._fragment.c();
			text_41 = createText("\n\n");
			text_42 = createText("The physical activity of fire suppression, rescue or both, inside of buildings or enclosed structures which are involved in a fire situation beyond the incipient stage. (See 29 CFR 1910.155).");
			accordion_20._fragment.c();
			text_43 = createText("\n\n");
			text_44 = createText("A respiratory inlet covering that is designed to form a partial seal with the face.");
			accordion_21._fragment.c();
			text_45 = createText("\n\n");
			text_46 = createText("The maximum atmospheric concentration of a hazardous substance from which an employee can be expected to be protected when wearing a respirator, and is determined by the assigned protection factor of the respirator or class of respirators and the exposure limit of the hazardous substance. The MUC can be determined mathematically by multiplying the assigned protection factor specified for a respirator by the required OSHA permissible exposure limit, short-term exposure limit, or ceiling limit. When no OSHA exposure limit is available for a hazardous substance, an employer must determine an MUC on the basis of relevant available information and informed professional judgment.");
			accordion_22._fragment.c();
			text_47 = createText("\n\n");
			text_48 = createText("A respirator in which the air pressure inside the facepiece is negative during inhalation with respect to the ambient air pressure outside the respirator.");
			accordion_23._fragment.c();
			text_49 = createText("\n\n");
			text_50 = createText("An atmosphere with an oxygen content below 19.5% by volume.");
			accordion_24._fragment.c();
			text_51 = createText("\n\n");
			text_52 = createText("An occupational exposure limit specified by OSHA.");
			accordion_25._fragment.c();
			text_53 = createText("\n\n");
			text_54 = createText("An individual whose legally permitted scope of practice (i.e., license, registration, or certification) allows him or her to independently provide, or be delegated the responsibility to provide, some or all of the healthcare services required by paragraph (e) of this section.");
			accordion_26._fragment.c();
			text_55 = createText("\n\n");
			text_56 = createText("A respirator in which the pressure inside the respiratory inlet covering exceeds the ambient air pressure outside the respirator.");
			accordion_27._fragment.c();
			text_57 = createText("\n\n");
			text_58 = createText("An air-purifying respirator that uses a blower to force the ambient air through air-purifying elements to the inlet covering.");
			accordion_28._fragment.c();
			text_59 = createText("\n\n");
			text_60 = createText("A positive pressure atmosphere-supplying respirator that admits breathing air to the facepiece when the positive pressure is reduced inside the facepiece by inhalation.");
			accordion_29._fragment.c();
			text_61 = createText("\n\n");
			text_62 = createText("A study that determines the protection provided by a respirator during use. This determination generally is accomplished by measuring the ratio of the concentration of an airborne contaminant (e.g., hazardous substance) outside the respirator (Co) to the concentration inside the respirator (Ci) (i.e., Co/Ci). Therefore, as the ratio between Co and Ci increases, the protection factor increases, indicating an increase in the level of protection provided to employees by the respirator. There are four types of protection factor studies: EPF, PPF, WPF, and SWPF.");
			accordion_30._fragment.c();
			text_63 = createText("\n\n");
			text_64 = createText("A study, conducted in the workplace, that measures the protection provided by a properly selected, fit-tested, and functioning respirator when used intermittently for only some fraction of the total workplace exposure time (i.e., sampling is conducted during periods when respirators are worn and not worn). EPFs are not directly comparable to Workplace Protection Factor (WPF) values because the determinations include both the time spent in contaminated atmospheres with and without respiratory protection; therefore, EPFs usually underestimate the protection afforded by a respirator that is used continuously in the workplace.");
			accordion_31._fragment.c();
			text_65 = createText("\n\n");
			text_66 = createText("A study that estimates the protection provided by a respirator within a specific respirator program. Like the EPF, it is focused not only on the respirator’s performance, but also the effectiveness of the complete respirator program. PPFs are affected by all factors of the program, including respirator selection and maintenance, user training and motivation, work activities and program administration.");
			accordion_32._fragment.c();
			text_67 = createText("\n\n");
			text_68 = createText("A study, conducted under actual conditions of use in the workplace, that measures the protection provided by a properly selected, fit-tested, and functioning respirator, when the respirator is worn correctly and used as part of a comprehensive respirator program that is in compliance with OSHA’s Respiratory Protection standard at 29 CFR 1910.134. Measurements of Co and Ci are obtained only while the respirator is being worn during performance of normal work tasks (i.e., samples are not collected when the respirator is not being worn). As the degree of protection afforded by the respirator increases, the WPF increases.");
			accordion_33._fragment.c();
			text_69 = createText("\n\n");
			text_70 = createText("A study, conducted in a controlled laboratory setting and in which Co and Ci sampling is performed while the respirator user performs a series of set exercises. The laboratory setting is used to control many of the variables found in workplace studies, while the exercises simulate the work activities of respirator users. This type of study is designed to determine the optimum performance of respirators by reducing the impact of sources of variability through maintenance of tightly controlled study conditions.");
			accordion_34._fragment.c();
			text_71 = createText("\n\n");
			text_72 = createText("A pass/fail fit test to assess the adequacy of respirator fit that relies on the individual’s response to the test agent.");
			accordion_35._fragment.c();
			text_73 = createText("\n\n");
			text_74 = createText("An assessment of the adequacy of respirator fit by numerically measuring the amount of leakage into the respirator.");
			accordion_36._fragment.c();
			text_75 = createText("\n\n");
			text_76 = createText("An occupational exposure level recommended by NIOSH.");
			accordion_37._fragment.c();
			text_77 = createText("\n\n");
			text_78 = createText("Respirator selection guidance developed by NIOSH that contains a set of respirator protection factors.");
			accordion_38._fragment.c();
			text_79 = createText("\n\n");
			text_80 = createText("That portion of a respirator that forms the protective barrier between the user’s respiratory tract and an air-purifying device or breathing air source, or both. It may be a facepiece, helmet, hood, suit, or a mouthpiece respirator with nose clamp.");
			accordion_39._fragment.c();
			text_81 = createText("\n\n");
			text_82 = createText("An atmosphere- supplying respirator for which the breathing air source is designed to be carried by the user.");
			accordion_40._fragment.c();
			text_83 = createText("\n\n");
			text_84 = createText("An atmosphere-supplying respirator for which the source of breathing air is not designed to be carried by the user.");
			accordion_41._fragment.c();
			text_85 = createText("\n\n");
			text_86 = createText("An occupational exposure level recommended by ACGIH.");
			accordion_42._fragment.c();
			text_87 = createText("\n\n");
			text_88 = createText("A respiratory inlet covering that forms a complete seal with the face.");
			accordion_43._fragment.c();
			text_89 = createText("\n\n");
			text_90 = createText("Time-Weighted Average is used to measure a worker's daily exposure to hazardous substances, averaged on an 8-hour workday. The average is calculated from air samples throughout a work cycle and the amount of time spent working in those conditions. OSHA uses TWAs to establish Permissible Exposure Limits for the contaminants encountered in industries.\nThe TWA is calculated in units of parts per million (ppm) or mg/m3.");
			accordion_44._fragment.c();
			text_91 = createText("\n\n");
			text_92 = createText("An action conducted by the respirator user to determine if the respirator is properly seated to the face.");
			accordion_45._fragment.c();
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			appendNode(text_2, accordion._slotted.default);
			accordion._mount(target, anchor);
			insertNode(text_3, target, anchor);
			appendNode(text_4, accordion_1._slotted.default);
			accordion_1._mount(target, anchor);
			insertNode(text_5, target, anchor);
			appendNode(text_6, accordion_2._slotted.default);
			accordion_2._mount(target, anchor);
			insertNode(text_7, target, anchor);
			appendNode(text_8, accordion_3._slotted.default);
			accordion_3._mount(target, anchor);
			insertNode(text_9, target, anchor);
			appendNode(text_10, accordion_4._slotted.default);
			accordion_4._mount(target, anchor);
			insertNode(text_11, target, anchor);
			appendNode(text_12, accordion_5._slotted.default);
			accordion_5._mount(target, anchor);
			insertNode(text_13, target, anchor);
			appendNode(text_14, accordion_6._slotted.default);
			accordion_6._mount(target, anchor);
			insertNode(text_15, target, anchor);
			appendNode(text_16, accordion_7._slotted.default);
			accordion_7._mount(target, anchor);
			insertNode(text_17, target, anchor);
			appendNode(text_18, accordion_8._slotted.default);
			accordion_8._mount(target, anchor);
			insertNode(text_19, target, anchor);
			appendNode(text_20, accordion_9._slotted.default);
			accordion_9._mount(target, anchor);
			insertNode(text_21, target, anchor);
			appendNode(text_22, accordion_10._slotted.default);
			accordion_10._mount(target, anchor);
			insertNode(text_23, target, anchor);
			appendNode(text_24, accordion_11._slotted.default);
			accordion_11._mount(target, anchor);
			insertNode(text_25, target, anchor);
			appendNode(text_26, accordion_12._slotted.default);
			accordion_12._mount(target, anchor);
			insertNode(text_27, target, anchor);
			appendNode(text_28, accordion_13._slotted.default);
			accordion_13._mount(target, anchor);
			insertNode(text_29, target, anchor);
			appendNode(text_30, accordion_14._slotted.default);
			accordion_14._mount(target, anchor);
			insertNode(text_31, target, anchor);
			appendNode(text_32, accordion_15._slotted.default);
			accordion_15._mount(target, anchor);
			insertNode(text_33, target, anchor);
			appendNode(text_34, accordion_16._slotted.default);
			accordion_16._mount(target, anchor);
			insertNode(text_35, target, anchor);
			appendNode(text_36, accordion_17._slotted.default);
			accordion_17._mount(target, anchor);
			insertNode(text_37, target, anchor);
			appendNode(text_38, accordion_18._slotted.default);
			accordion_18._mount(target, anchor);
			insertNode(text_39, target, anchor);
			appendNode(text_40, accordion_19._slotted.default);
			accordion_19._mount(target, anchor);
			insertNode(text_41, target, anchor);
			appendNode(text_42, accordion_20._slotted.default);
			accordion_20._mount(target, anchor);
			insertNode(text_43, target, anchor);
			appendNode(text_44, accordion_21._slotted.default);
			accordion_21._mount(target, anchor);
			insertNode(text_45, target, anchor);
			appendNode(text_46, accordion_22._slotted.default);
			accordion_22._mount(target, anchor);
			insertNode(text_47, target, anchor);
			appendNode(text_48, accordion_23._slotted.default);
			accordion_23._mount(target, anchor);
			insertNode(text_49, target, anchor);
			appendNode(text_50, accordion_24._slotted.default);
			accordion_24._mount(target, anchor);
			insertNode(text_51, target, anchor);
			appendNode(text_52, accordion_25._slotted.default);
			accordion_25._mount(target, anchor);
			insertNode(text_53, target, anchor);
			appendNode(text_54, accordion_26._slotted.default);
			accordion_26._mount(target, anchor);
			insertNode(text_55, target, anchor);
			appendNode(text_56, accordion_27._slotted.default);
			accordion_27._mount(target, anchor);
			insertNode(text_57, target, anchor);
			appendNode(text_58, accordion_28._slotted.default);
			accordion_28._mount(target, anchor);
			insertNode(text_59, target, anchor);
			appendNode(text_60, accordion_29._slotted.default);
			accordion_29._mount(target, anchor);
			insertNode(text_61, target, anchor);
			appendNode(text_62, accordion_30._slotted.default);
			accordion_30._mount(target, anchor);
			insertNode(text_63, target, anchor);
			appendNode(text_64, accordion_31._slotted.default);
			accordion_31._mount(target, anchor);
			insertNode(text_65, target, anchor);
			appendNode(text_66, accordion_32._slotted.default);
			accordion_32._mount(target, anchor);
			insertNode(text_67, target, anchor);
			appendNode(text_68, accordion_33._slotted.default);
			accordion_33._mount(target, anchor);
			insertNode(text_69, target, anchor);
			appendNode(text_70, accordion_34._slotted.default);
			accordion_34._mount(target, anchor);
			insertNode(text_71, target, anchor);
			appendNode(text_72, accordion_35._slotted.default);
			accordion_35._mount(target, anchor);
			insertNode(text_73, target, anchor);
			appendNode(text_74, accordion_36._slotted.default);
			accordion_36._mount(target, anchor);
			insertNode(text_75, target, anchor);
			appendNode(text_76, accordion_37._slotted.default);
			accordion_37._mount(target, anchor);
			insertNode(text_77, target, anchor);
			appendNode(text_78, accordion_38._slotted.default);
			accordion_38._mount(target, anchor);
			insertNode(text_79, target, anchor);
			appendNode(text_80, accordion_39._slotted.default);
			accordion_39._mount(target, anchor);
			insertNode(text_81, target, anchor);
			appendNode(text_82, accordion_40._slotted.default);
			accordion_40._mount(target, anchor);
			insertNode(text_83, target, anchor);
			appendNode(text_84, accordion_41._slotted.default);
			accordion_41._mount(target, anchor);
			insertNode(text_85, target, anchor);
			appendNode(text_86, accordion_42._slotted.default);
			accordion_42._mount(target, anchor);
			insertNode(text_87, target, anchor);
			appendNode(text_88, accordion_43._slotted.default);
			accordion_43._mount(target, anchor);
			insertNode(text_89, target, anchor);
			appendNode(text_90, accordion_44._slotted.default);
			accordion_44._mount(target, anchor);
			insertNode(text_91, target, anchor);
			appendNode(text_92, accordion_45._slotted.default);
			accordion_45._mount(target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			accordion._unmount();
			detachNode(text_3);
			accordion_1._unmount();
			detachNode(text_5);
			accordion_2._unmount();
			detachNode(text_7);
			accordion_3._unmount();
			detachNode(text_9);
			accordion_4._unmount();
			detachNode(text_11);
			accordion_5._unmount();
			detachNode(text_13);
			accordion_6._unmount();
			detachNode(text_15);
			accordion_7._unmount();
			detachNode(text_17);
			accordion_8._unmount();
			detachNode(text_19);
			accordion_9._unmount();
			detachNode(text_21);
			accordion_10._unmount();
			detachNode(text_23);
			accordion_11._unmount();
			detachNode(text_25);
			accordion_12._unmount();
			detachNode(text_27);
			accordion_13._unmount();
			detachNode(text_29);
			accordion_14._unmount();
			detachNode(text_31);
			accordion_15._unmount();
			detachNode(text_33);
			accordion_16._unmount();
			detachNode(text_35);
			accordion_17._unmount();
			detachNode(text_37);
			accordion_18._unmount();
			detachNode(text_39);
			accordion_19._unmount();
			detachNode(text_41);
			accordion_20._unmount();
			detachNode(text_43);
			accordion_21._unmount();
			detachNode(text_45);
			accordion_22._unmount();
			detachNode(text_47);
			accordion_23._unmount();
			detachNode(text_49);
			accordion_24._unmount();
			detachNode(text_51);
			accordion_25._unmount();
			detachNode(text_53);
			accordion_26._unmount();
			detachNode(text_55);
			accordion_27._unmount();
			detachNode(text_57);
			accordion_28._unmount();
			detachNode(text_59);
			accordion_29._unmount();
			detachNode(text_61);
			accordion_30._unmount();
			detachNode(text_63);
			accordion_31._unmount();
			detachNode(text_65);
			accordion_32._unmount();
			detachNode(text_67);
			accordion_33._unmount();
			detachNode(text_69);
			accordion_34._unmount();
			detachNode(text_71);
			accordion_35._unmount();
			detachNode(text_73);
			accordion_36._unmount();
			detachNode(text_75);
			accordion_37._unmount();
			detachNode(text_77);
			accordion_38._unmount();
			detachNode(text_79);
			accordion_39._unmount();
			detachNode(text_81);
			accordion_40._unmount();
			detachNode(text_83);
			accordion_41._unmount();
			detachNode(text_85);
			accordion_42._unmount();
			detachNode(text_87);
			accordion_43._unmount();
			detachNode(text_89);
			accordion_44._unmount();
			detachNode(text_91);
			accordion_45._unmount();
		},

		d: function destroy$$1() {
			accordion.destroy(false);
			accordion_1.destroy(false);
			accordion_2.destroy(false);
			accordion_3.destroy(false);
			accordion_4.destroy(false);
			accordion_5.destroy(false);
			accordion_6.destroy(false);
			accordion_7.destroy(false);
			accordion_8.destroy(false);
			accordion_9.destroy(false);
			accordion_10.destroy(false);
			accordion_11.destroy(false);
			accordion_12.destroy(false);
			accordion_13.destroy(false);
			accordion_14.destroy(false);
			accordion_15.destroy(false);
			accordion_16.destroy(false);
			accordion_17.destroy(false);
			accordion_18.destroy(false);
			accordion_19.destroy(false);
			accordion_20.destroy(false);
			accordion_21.destroy(false);
			accordion_22.destroy(false);
			accordion_23.destroy(false);
			accordion_24.destroy(false);
			accordion_25.destroy(false);
			accordion_26.destroy(false);
			accordion_27.destroy(false);
			accordion_28.destroy(false);
			accordion_29.destroy(false);
			accordion_30.destroy(false);
			accordion_31.destroy(false);
			accordion_32.destroy(false);
			accordion_33.destroy(false);
			accordion_34.destroy(false);
			accordion_35.destroy(false);
			accordion_36.destroy(false);
			accordion_37.destroy(false);
			accordion_38.destroy(false);
			accordion_39.destroy(false);
			accordion_40.destroy(false);
			accordion_41.destroy(false);
			accordion_42.destroy(false);
			accordion_43.destroy(false);
			accordion_44.destroy(false);
			accordion_45.destroy(false);
		}
	};
}

function Glossary(options) {
	init(this, options);
	this._state = assign({}, options.data);

	if (!options._root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment$26(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(Glossary.prototype, proto);

/* client/data/content/how-to-use-it.html generated by Svelte v1.41.3 */
function create_main_fragment$27(state, component) {
	var h1, text_1, img, text_2, blockquote;

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "How To Use It";
			text_1 = createText("\n\nThe respirator selection tool contains a series of questions to help you choose the class of respirator to use in a setting with airborne contaminants. Recommendations are based primarily on contaminants’ physical, chemical, and toxicological properties. Other considerations include filtration efficiency, air supply capability, leakage danger, and face seal characteristics.\n\nRespirator classes are consistent with respirator certification groupings as specified in the NIOSH Guide to the Selection and Use of Particulate Respirators (Certified Under 42 CFR 84).\n\n");
			img = createElement("img");
			text_2 = createText("\n");
			blockquote = createElement("blockquote");
			blockquote.textContent = "The recommended respirator class is based on the minimum acceptable degree of protection. NIOSH recommends using respirators with greater protective properties when available.";
			this.h();
		},

		h: function hydrate() {
			img.src = "wp-images/pexels-photo-583389-300x200.jpeg";
			img.alt = '';
			img.width = "439";
			img.height = "292";
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			insertNode(img, target, anchor);
			insertNode(text_2, target, anchor);
			insertNode(blockquote, target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			detachNode(img);
			detachNode(text_2);
			detachNode(blockquote);
		},

		d: noop
	};
}

function How_to_use_it(options) {
	init(this, options);
	this._state = assign({}, options.data);

	this._fragment = create_main_fragment$27(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);
	}
}

assign(How_to_use_it.prototype, proto);

/* client/data/content/osha-standards.html generated by Svelte v1.41.3 */
function create_main_fragment$28(state, component) {
	var h1, text_1;

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "OSHA Standards";
			text_1 = createText("\n\nThis section applies to General Industry (part 1910), Shipyards (part 1915), Marine Terminals (part 1917), Longshoring (part 1918), and Construction (part 1926). [display-posts tag=\"OSHA-Standards\" posts_per_page=\"15\"]");
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
		},

		d: noop
	};
}

function Osha_standards(options) {
	init(this, options);
	this._state = assign({}, options.data);

	this._fragment = create_main_fragment$28(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);
	}
}

assign(Osha_standards.prototype, proto);

/* client/data/content/purpose-of-respirators.html generated by Svelte v1.41.3 */
function create_main_fragment$29(state, component) {
	var h1, text_1, img, text_2;

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "Purpose of Respirators";
			text_1 = createText("\n\nRespirators protect employees from inhaling harmful substances, including chemical, biological, and radiological agents. These may come in the form of airborne vapors, gases, dust, fogs, fumes, mists, smokes, or sprays. There are also hazards associated with oxygen deprivation.\n\nOrdinarily, there are a wide range of engineering or workplace controls put in place to eliminate or reduce such dangers. But in some cases certain routine operations and emergency situation may require the use of personal protective equipment and/or respirators.\n\n");
			img = createElement("img");
			text_2 = createText("\n\nNote that respirators only provide protection from respiratory hazards when they are properly selected and used in compliance with the OSHA Respiratory Protection Standard, 29 CFR 1910.134.");
			this.h();
		},

		h: function hydrate() {
			img.src = "wp-images/building-joy-planning-plans-300x200.jpg";
			img.alt = '';
			img.width = "300";
			img.height = "200";
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			insertNode(img, target, anchor);
			insertNode(text_2, target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			detachNode(img);
			detachNode(text_2);
		},

		d: noop
	};
}

function Purpose_of_respirators(options) {
	init(this, options);
	this._state = assign({}, options.data);

	this._fragment = create_main_fragment$29(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);
	}
}

assign(Purpose_of_respirators.prototype, proto);

/* client/data/content/resources.html generated by Svelte v1.41.3 */
function create_main_fragment$30(state, component) {
	var h1, text_1, text_2, text_3, text_4, a, text_6, a_1, text_8, text_9, a_2, text_11, text_12, a_3, text_14, text_15, text_16, text_17, text_18, text_19;

	var accordion = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Contacting OSHA" }
	});

	var accordion_1 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Small Businesses" }
	});

	var accordion_2 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Cartridge Change Schedules" }
	});

	var accordion_3 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Respirator Programs" }
	});

	var accordion_4 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Compliance Assistance Specialists"
		}
	});

	var accordion_5 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "OSHA Publications" }
	});

	var accordion_6 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Quick Takes" }
	});

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "Resources";
			text_1 = createText("\n\nFor assistance, contact us. We are OSHA. We can help. It’s confidential.\n\n");
			text_2 = createText("To get a list of OSHA publications, to ask questions or to get more information, to contact OSHA’s free consultation service, or to file a confidential complaint, contact\nOSHA at 1-800-321-OSHA (6742)\n(TTY) 1-877-889-5627\nor visit www.osha.gov");
			accordion._fragment.c();
			text_3 = createText("\n\n");
			text_4 = createText("OSHA offers free consultation to qualifying small- and medium-sized businesses to help recognize hazards, suggest approaches to solving problems and identifying the kinds of help available if further assistance is required.\nVisit ");
			a = createElement("a");
			a.textContent = "https://www.osha.gov/dcsp/smallbusiness/index.html";
			text_6 = createText(" for information on compliance assistance and consultation programs.\nIn addition, the OSHA Small Entity Compliance Guide provides procedures and checklists that can help small businesses comply with the respirator standard. This information can be accessed at: ");
			a_1 = createElement("a");
			a_1.textContent = "https://www.osha.gov/Publications/3384small-entity-for-respiratory-protection-standard-rev.pdf";
			accordion_1._fragment.c();
			text_8 = createText("\n\n");
			text_9 = createText("OSHA provides information on determining respirator cartridge change schedules ");
			a_2 = createElement("a");
			a_2.textContent = "https://www.osha.gov/SLTC/etools/respiratory/change_schedule.html";
			accordion_2._fragment.c();
			text_11 = createText("\n\n");
			text_12 = createText("Detailed information on respirator programs can be accessed at\n");
			a_3 = createElement("a");
			a_3.textContent = "http://www.osha.gov/SLTC/etools/respiratory";
			accordion_3._fragment.c();
			text_14 = createText("\n\n");
			text_15 = createText("OSHA has compliance assistance specialists throughout the nation who can provide information to employers and workers about OSHA standards, short educational programs on specific hazards or OSHA rights and responsibilities, and information on additional compliance assistance resources. Contact your local OSHA office for more information.");
			accordion_4._fragment.c();
			text_16 = createText("\n\n");
			text_17 = createText("OSHA’s extensive publications help explain OSHA standards, job hazards, and mitigation strategies and provide assistance in developing effective injury and illness prevention programs. For a listing of free publications, visit www.osha.gov or call 1-800-321-OSHA (6742).");
			accordion_5._fragment.c();
			text_18 = createText("\n\n");
			text_19 = createText("OSHA’s free, twice-monthly online newsletter, QuickTakes, offers the latest news about OSHA initiatives and products to assist employers and workers in finding and preventing workplace hazards. To sign up for QuickTakes, visit OSHA’s website at www.osha.gov and click on QuickTakes at the top of the page.");
			accordion_6._fragment.c();
			this.h();
		},

		h: function hydrate() {
			a.href = "https://www.osha.gov/dcsp/smallbusiness/index.html";
			a_1.href = "https://www.osha.gov/Publications/3384small-entity-for-respiratory-protection-standard-rev.pdf";
			a_2.href = "https://www.osha.gov/SLTC/etools/respiratory/change_schedule.html";
			a_3.href = "http://www.osha.gov/SLTC/etools/respiratory";
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			appendNode(text_2, accordion._slotted.default);
			accordion._mount(target, anchor);
			insertNode(text_3, target, anchor);
			appendNode(text_4, accordion_1._slotted.default);
			appendNode(a, accordion_1._slotted.default);
			appendNode(text_6, accordion_1._slotted.default);
			appendNode(a_1, accordion_1._slotted.default);
			accordion_1._mount(target, anchor);
			insertNode(text_8, target, anchor);
			appendNode(text_9, accordion_2._slotted.default);
			appendNode(a_2, accordion_2._slotted.default);
			accordion_2._mount(target, anchor);
			insertNode(text_11, target, anchor);
			appendNode(text_12, accordion_3._slotted.default);
			appendNode(a_3, accordion_3._slotted.default);
			accordion_3._mount(target, anchor);
			insertNode(text_14, target, anchor);
			appendNode(text_15, accordion_4._slotted.default);
			accordion_4._mount(target, anchor);
			insertNode(text_16, target, anchor);
			appendNode(text_17, accordion_5._slotted.default);
			accordion_5._mount(target, anchor);
			insertNode(text_18, target, anchor);
			appendNode(text_19, accordion_6._slotted.default);
			accordion_6._mount(target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			accordion._unmount();
			detachNode(text_3);
			accordion_1._unmount();
			detachNode(text_8);
			accordion_2._unmount();
			detachNode(text_11);
			accordion_3._unmount();
			detachNode(text_14);
			accordion_4._unmount();
			detachNode(text_16);
			accordion_5._unmount();
			detachNode(text_18);
			accordion_6._unmount();
		},

		d: function destroy$$1() {
			accordion.destroy(false);
			accordion_1.destroy(false);
			accordion_2.destroy(false);
			accordion_3.destroy(false);
			accordion_4.destroy(false);
			accordion_5.destroy(false);
			accordion_6.destroy(false);
		}
	};
}

function Resources(options) {
	init(this, options);
	this._state = assign({}, options.data);

	if (!options._root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment$30(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(Resources.prototype, proto);

/* client/data/content/respirator-characteristics.html generated by Svelte v1.41.3 */
function create_main_fragment$31(state, component) {
	var h1, text_1, text_2, ul, text_12, text_13, text_14, ul_1, text_18, text_19, text_20, text_21, text_22, ul_2, text_25, img, text_26, img_1, text_27, img_2, text_28, text_29, text_30, ul_3, text_33, text_34, text_35, ul_4, text_39;

	var accordion = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Oil Characteristics" }
	});

	var accordion_1 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Quarter-face, Half-face, and Full-face"
		}
	});

	var accordion_2 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Hoods and Helmets" }
	});

	var accordion_3 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Loose fitting vs. Tight fitting" }
	});

	var accordion_4 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Negative vs. Positive Pressure Systems"
		}
	});

	var accordion_5 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Positive Pressure Modes" }
	});

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "Respirator Characteristics";
			text_1 = createText("\n\n");
			text_2 = createText("Air-purifying respirators are rated as N, R, or P according to their protection against oils. This rating is important because some industrial oils degrade filters. Air-purifying respirators are rated as N, R, or P according to their protection against oils. This rating is important because some industrial oils degrade filters.\n");
			ul = createElement("ul");
			ul.innerHTML = "<li>N= <strong>N</strong>ot resistant to oil</li>\n \t<li>R= somewhat <strong>R</strong>esistant to oil</li>\n \t<li>P= strongly resistant, or oil <strong>P</strong>roof</li>\n";
			text_12 = createText("\nYou will often find this letter rating alongside the percentage of particulate filtration protection that the respirator offers (usually 95%, 99%, or 99.7%). The rating would look something like, “N99” or “P95”.");
			accordion._fragment.c();
			text_13 = createText("\n\n");
			text_14 = createText("Respirators can be either:\n");
			ul_1 = createElement("ul");
			ul_1.innerHTML = "<li>Quarter-face respirators, where just the top of the nose and chin are covered</li>\n \t<li>Half-face respirators, where the whole nose and down around the chin are covered</li>\n \t<li>Full-face respirators, where the whole face, at least up to the hairline and down around the chin are covered. Sometimes the whole head is covered.</li>\n";
			text_18 = createText("\nA full face respirator provides a higher level of protection than half-facepiece respirator because it has better sealing characteristics. Since it covers the user's eyes and face, it can also be used to protect against liquid splashes and irritating vapors.");
			accordion_1._fragment.c();
			text_19 = createText("\n\n");
			text_20 = createText("Eye protection is often required in addition to respiratory protection when working with airborne particles and chemicals. Full facepiece respirators are used to provide eye protection. Full-face coverage is often integrated with a hood or helmet to provide better insulation from various hazards (e.g. falling material, etc.)");
			accordion_2._fragment.c();
			text_21 = createText("\n\n");
			text_22 = createText("Respirators can be either:\n");
			ul_2 = createElement("ul");
			ul_2.innerHTML = "<li>Tight-fitting</li>\n \t<li>Loose-fitting</li>\n";
			text_25 = createText("\nTight-fitting respirators create a tight seal between the respirator and the face and/or neck of the respirator user. If the respirator's seal leaks, contaminated air will be pulled into the facepiece, endangering the user. If you are required to use a tight-fitting respirator at work, you must be fit tested with the respirator selected for your use. You also must perform regular user seal checks. This check determines if the respirator is properly sealed to the face or needs to be readjusted.\nLoose-fitting respirators do not depend on a tight seal with the face to provide protection. Therefore, they do not need to be fit tested.\n\n");
			img = createElement("img");
			text_26 = createText(" ");
			img_1 = createElement("img");
			text_27 = createText(" ");
			img_2 = createElement("img");
			text_28 = createText("\n\nLoose fitting full-face PARPs vs. Tight fitting half-face SAR");
			accordion_3._fragment.c();
			text_29 = createText("\n\n");
			text_30 = createText("Respirators operate either as:\n");
			ul_3 = createElement("ul");
			ul_3.innerHTML = "<li>Negative pressure systems</li>\n \t<li>Positive pressure systems</li>\n";
			text_33 = createText("\nDuring inhalation negative pressure respirators have lower air pressure inside the facepiece compared to the air pressure outside. If the facepiece-to-face seal leaks on these types of respirators, air contaminants will be drawn into the breathing air. All respirators without a supplied-air component are considered negative pressure respirators.\nPositive pressure respirators maintain positive air pressure inside the facepiece at all times by means of supplied air. Therefore the air pressure inside the facepiece remains greater than the air pressure outside the facepiece. Thus, any leakage around the facepiece seal should result in air escaping from inside the facepiece to the outside environment rather than worksite contaminants leaking into the facepiece.");
			accordion_4._fragment.c();
			text_34 = createText("\n\n");
			text_35 = createText("There are three modes that positive pressure respirators operate in:\n");
			ul_4 = createElement("ul");
			ul_4.innerHTML = "<li>Demand mode</li>\n \t<li>Pressure demand mode</li>\n \t<li>Continuous flow mode</li>\n";
			text_39 = createText("\nDemand mode means that air only flows into the mask when you inhale. This system would allow outside air in if there was a breach around the seal of the respirator, because the pressure is lower inside the mask during inhalation. This affects the protection factors of the respirator. Pressure demand mode means that throughout the breathing cycle the supplied air regulator works to maintain positive pressure inside of the respirator. If there is a breach in the seal of the respirator, the air inside of the respirator will escape from where the breach is not allowing outside air to enter.\nContinuous flow mode means that a continuous stream of air is blown into the facepiece at all times.\nIf the respirator also has filters or cartridges is important to choose filters that have the appropriate APF for the mode in which the respirator will be operating.");
			accordion_5._fragment.c();
			this.h();
		},

		h: function hydrate() {
			img.src = "wp-images/OSHASAR.jpg";
			img.alt = '';
			img.width = "199";
			img.height = "250";
			img_1.src = "wp-images/LoosePARP.jpg";
			img_1.alt = '';
			img_1.width = "199";
			img_1.height = "250";
			img_2.src = "wp-images/HalfFaceSAR-243x300.jpg";
			img_2.alt = '';
			img_2.width = "243";
			img_2.height = "300";
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			appendNode(text_2, accordion._slotted.default);
			appendNode(ul, accordion._slotted.default);
			appendNode(text_12, accordion._slotted.default);
			accordion._mount(target, anchor);
			insertNode(text_13, target, anchor);
			appendNode(text_14, accordion_1._slotted.default);
			appendNode(ul_1, accordion_1._slotted.default);
			appendNode(text_18, accordion_1._slotted.default);
			accordion_1._mount(target, anchor);
			insertNode(text_19, target, anchor);
			appendNode(text_20, accordion_2._slotted.default);
			accordion_2._mount(target, anchor);
			insertNode(text_21, target, anchor);
			appendNode(text_22, accordion_3._slotted.default);
			appendNode(ul_2, accordion_3._slotted.default);
			appendNode(text_25, accordion_3._slotted.default);
			appendNode(img, accordion_3._slotted.default);
			appendNode(text_26, accordion_3._slotted.default);
			appendNode(img_1, accordion_3._slotted.default);
			appendNode(text_27, accordion_3._slotted.default);
			appendNode(img_2, accordion_3._slotted.default);
			appendNode(text_28, accordion_3._slotted.default);
			accordion_3._mount(target, anchor);
			insertNode(text_29, target, anchor);
			appendNode(text_30, accordion_4._slotted.default);
			appendNode(ul_3, accordion_4._slotted.default);
			appendNode(text_33, accordion_4._slotted.default);
			accordion_4._mount(target, anchor);
			insertNode(text_34, target, anchor);
			appendNode(text_35, accordion_5._slotted.default);
			appendNode(ul_4, accordion_5._slotted.default);
			appendNode(text_39, accordion_5._slotted.default);
			accordion_5._mount(target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			accordion._unmount();
			detachNode(text_13);
			accordion_1._unmount();
			detachNode(text_19);
			accordion_2._unmount();
			detachNode(text_21);
			accordion_3._unmount();
			detachNode(text_29);
			accordion_4._unmount();
			detachNode(text_34);
			accordion_5._unmount();
		},

		d: function destroy$$1() {
			accordion.destroy(false);
			accordion_1.destroy(false);
			accordion_2.destroy(false);
			accordion_3.destroy(false);
			accordion_4.destroy(false);
			accordion_5.destroy(false);
		}
	};
}

function Respirator_characteristics(options) {
	init(this, options);
	this._state = assign({}, options.data);

	if (!options._root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment$31(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(Respirator_characteristics.prototype, proto);

/* client/data/content/respirator-safety.html generated by Svelte v1.41.3 */
function create_main_fragment$32(state, component) {
	var h1, text_1, text_2, text_3, text_4, text_5, strong, text_7, ul, text_14, text_15, text_16, text_17, ul_1, text_21, ul_2, text_24;

	var accordion = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Overview" }
	});

	var accordion_1 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Eye Irritation" }
	});

	var accordion_2 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "When to leave" }
	});

	var accordion_3 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Kinds of Hazards Encountered" }
	});

	var accordion_4 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "User Seal Check" }
	});

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "Respirator Safety";
			text_1 = createText("\n\n");
			text_2 = createText("Respirators only provide protection from respiratory hazards when they are properly selected and used in compliance with the Respiratory Protection standard (29 CFR 1910.134 and 29 CFR 1926.103). It is imperative to choose the right respirator for the job and to maintain the respirator so that it continues to provide optimum protection from the hazards of the worksite.");
			accordion._fragment.c();
			text_3 = createText("\n\n");
			text_4 = createText("Eye protecting full facepieces, helmets, or hoods are required for routine exposures to airborne contaminants that cause any eye irritation. When data on threshold levels for eye irritation are insufficient, quarter or half-mask respirators can be used, as long as the worker has no eye discomfort. For escape, some eye irritation is permissible if the severity of irritation does not inhibit the escape and if no irreversible damage is likely.");
			accordion_1._fragment.c();
			text_5 = createText("\n\n");
			strong = createElement("strong");
			strong.textContent = "If you detect any odor while wearing your respirator, get out immediately.";
			text_7 = createText("\n\nEmployers are required to provide a “safe area” in the workplace where workers can safely remove their respirators to wash or conduct maintenance on them. You should never adjust a respirator in the contaminated work area. Always go to the safe area before removing your respirator.\n\nOther reasons you may need to leave the work area include:\n");
			ul = createElement("ul");
			ul.innerHTML = "<li>If you need to wash your face or the respirator facepiece to prevent eye or skin irritation associated with respirator use.</li>\n \t<li>If you detect vapor or gas breaking through (the filter may need changed).</li>\n \t<li>If you notice that the facepiece is leaking.</li>\n \t<li>If you observe a change in breathing resistance (the filter may need changed).</li>\n \t<li>If the respirator or parts of the respirator, such as valves or straps, are not working properly and need to be replaced.</li>\n";
			accordion_2._fragment.c();
			text_14 = createText("\n");
			text_15 = createText("Airborne vapors, gases, dust, fogs, fumes, fibers, mists, smokes, or sprays all can carry or contain hazardous substances and present serious dangers to workers who inhale them. There are also hazardous atmospheres such as low-oxygen atmospheres that can endanger the life of the employee. Respirators protect against many of these dangers.");
			accordion_3._fragment.c();
			text_16 = createText("\n\n");
			text_17 = createText("User seal checks are a quick and easy way for employees to verify that they have put on their respirators correctly and that the respirators are working properly. A user seal check is NOT a kind of fit testing.\n\nTo conduct a user seal check, the employee performs a negative or positive pressure fit check, depending on what kind of respirator they’re using.\n\nFor the negative pressure check, the employee:\n");
			ul_1 = createElement("ul");
			ul_1.innerHTML = "<li>covers the respirator inlets (cartridges, canisters, or seals)</li>\n \t<li>gently inhales, and</li>\n \t<li>holds breath for 10 seconds.The facepiece should collapse on the worker’s face and remain collapsed.</li>\n";
			text_21 = createText("\nFor the positive pressure check, the worker:\n");
			ul_2 = createElement("ul");
			ul_2.innerHTML = "<li>covers the respirator exhalation valve(s), and</li>\n \t<li>exhales.</li>\n";
			text_24 = createText("\nThe facepiece should hold the positive pressure for a few seconds. During this time, the employee should not hear or feel the air leaking out of the face-to-facepiece seal.");
			accordion_4._fragment.c();
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			appendNode(text_2, accordion._slotted.default);
			accordion._mount(target, anchor);
			insertNode(text_3, target, anchor);
			appendNode(text_4, accordion_1._slotted.default);
			accordion_1._mount(target, anchor);
			insertNode(text_5, target, anchor);
			appendNode(strong, accordion_2._slotted.default);
			appendNode(text_7, accordion_2._slotted.default);
			appendNode(ul, accordion_2._slotted.default);
			accordion_2._mount(target, anchor);
			insertNode(text_14, target, anchor);
			appendNode(text_15, accordion_3._slotted.default);
			accordion_3._mount(target, anchor);
			insertNode(text_16, target, anchor);
			appendNode(text_17, accordion_4._slotted.default);
			appendNode(ul_1, accordion_4._slotted.default);
			appendNode(text_21, accordion_4._slotted.default);
			appendNode(ul_2, accordion_4._slotted.default);
			appendNode(text_24, accordion_4._slotted.default);
			accordion_4._mount(target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			accordion._unmount();
			detachNode(text_3);
			accordion_1._unmount();
			detachNode(text_5);
			accordion_2._unmount();
			detachNode(text_14);
			accordion_3._unmount();
			detachNode(text_16);
			accordion_4._unmount();
		},

		d: function destroy$$1() {
			accordion.destroy(false);
			accordion_1.destroy(false);
			accordion_2.destroy(false);
			accordion_3.destroy(false);
			accordion_4.destroy(false);
		}
	};
}

function Respirator_safety(options) {
	init(this, options);
	this._state = assign({}, options.data);

	if (!options._root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment$32(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(Respirator_safety.prototype, proto);

/* client/data/content/top-10-terms-to-know.html generated by Svelte v1.41.3 */
function create_main_fragment$33(state, component) {
	var h1, text_1, text_2, text_3, text_4, text_5, text_6, text_7, text_8, text_9, text_10, text_11, text_12, text_13, text_14, text_15, text_16, text_17, text_18;

	var accordion = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Exposure Limits" }
	});

	var accordion_1 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "APF" }
	});

	var accordion_2 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "MUC" }
	});

	var accordion_3 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "TWA" }
	});

	var accordion_4 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Ceiling" }
	});

	var accordion_5 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Oxygen-Deficient Atmosphere" }
	});

	var accordion_6 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Loose fit vs. Tight fit" }
	});

	var accordion_7 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Negative vs. Positive Pressure Systems"
		}
	});

	var accordion_8 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Filter series and Filter efficiency"
		}
	});

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "Top 10 Terms To Know";
			text_1 = createText("\n\n");
			text_2 = createText("PEL: Permissible Exposure Limit. OSHA’s permissible exposure limits establish the maximum level of a specific airborne hazard that an employee can be exposed to, averaged over an 8-hour workday.\n\nREL: Recommended Exposure Limit. The NIOSH Recommended Exposure Limit is a non-mandatory, recommended occupational exposure limit.The OSHA PEL is the legally enforceable regulatory limit. Employers are required to take actions to reduce worker exposures if air samples show levels above OSHA's calculated PEL. However, because OSHA recognizes that many of its PELs are outdated and inadequate measures of worker safety, both OSHA and NIOSH recommend that employers take actions to keep worker exposures below the NIOSH REL.\n\nSTEL: Short Term Exposure Limit. Short-term exposure limits are concentrations above which a worker should not be exposed, averaged over 15 minutes. Exposures cannot be repeated more than 4 times per day\n\nTLV: Threshold Limit Value. An occupational exposure level recommended by ACGIH. TLVs are the maximum average airborne concentration of a hazardous material to which healthy adult workers can be exposed during an 8-hour workday and 40-hour workweek—over a working lifetime—without experiencing significant adverse health effects.");
			accordion._fragment.c();
			text_3 = createText("\n\n");
			text_4 = createText("The Assigned Protection Factor (APF) indicates the workplace level of respiratory protection that a respirator or class of respirators is expected to provide to employees when the employer implements a continuing, effective respiratory protection program as specified by this section.");
			accordion_1._fragment.c();
			text_5 = createText("\n\n");
			text_6 = createText("Maximum Use Concentration (MUC) is the maximum atmospheric concentration of a hazardous substance from which an employee can be expected to be protected when wearing a respirator, and is determined by the assigned protection factor of the respirator or class of respirators and the exposure limit of the hazardous substance. The MUC can be determined mathematically by multiplying the assigned protection factor specified for a respirator by the required OSHA permissible exposure limit, short-term exposure limit, or ceiling limit. When no OSHA exposure limit is available for a hazardous substance, an employer must determine an MUC on the basis of relevant available information and informed professional judgment.");
			accordion_2._fragment.c();
			text_7 = createText("\n\n");
			text_8 = createText("Time-Weighted Average is used to measure a worker's daily exposure to hazardous substances, averaged on an 8-hour workday. The average is calculated from air samples  throughout a work cycle and the amount of time spent working in those conditions. OSHA uses TWAs to establish Permissible Exposure Limits for the contaminants encountered in industries.  The TWA is calculated in units of parts per million (ppm) or mg/m3.");
			accordion_3._fragment.c();
			text_9 = createText("\n\n");
			text_10 = createText("Ceiling limits are concentrations above which a worker should never be exposed.");
			accordion_4._fragment.c();
			text_11 = createText("\n\n");
			text_12 = createText("An atmosphere with oxygen content below 19.5% by volume.Immediately Dangerous to Life or HealthAn atmosphere that poses an immediate threat to life, would cause irreversible adverse health effects, or would impair an individual’s ability to escape from a dangerous atmosphere.");
			accordion_5._fragment.c();
			text_13 = createText("\n\n");
			text_14 = createText("A Loose-fitting facepiece is designed to form a partial seal with the face.\n\nA Tight-fitting facepiece forms a complete seal with the face.");
			accordion_6._fragment.c();
			text_15 = createText("\n\n");
			text_16 = createText("Respirators operate either as:\n\n• Negative pressure systems\n\n• Positive pressure systems\n\nDuring inhalation negative pressure respirators have lower air pressure inside the facepiece compared to the air pressure outside. If the facepiece-to-face seal leaks on these types of respirators, air contaminants will be drawn into the breathing air. All respirators without a supplied-air component are considered negative pressure respirators.\n\nPositive pressure respirators maintain positive air pressure inside the facepiece at all times by means of supplied air. Therefore the air pressure inside the facepiece remains greater than the air pressure outside the facepiece. Thus, any leakage around the facepiece seal should result in air escaping from inside the facepiece to the outside environment rather than worksite contaminants leaking into the facepiece.");
			accordion_7._fragment.c();
			text_17 = createText("\n\n");
			text_18 = createText("Air-purifying respirators that filter out at least 95% of airborne particles during “worst case” testing are given a 95 rating for filter efficiency. Those that filter out at least 99% receive a “99” rating. And those that filter at least 99.97% (essentially 100%) receive a “100” rating.\n\nAir-purifying respirators are rated in a filter series as N, R, or P for protection against oils. This rating is important in industry because some industrial oils can degrade the filter performance so it doesn’t filter properly. Respirators are rated “N,” if they are Not resistant to oil, “R” if somewhat Resistant to oil, and “P” if strongly resistant (oil Proof).NIOSH uses very high standards to test and approve respirators for occupational uses. NIOSH-approved disposable respirators are marked with the manufacturer’s name, the part number (P/N), the protection provided by the filter (e.g., N-95), and “NIOSH.” This information is printed on the facepiece, exhalation valve cover, or head straps.");
			accordion_8._fragment.c();
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			appendNode(text_2, accordion._slotted.default);
			accordion._mount(target, anchor);
			insertNode(text_3, target, anchor);
			appendNode(text_4, accordion_1._slotted.default);
			accordion_1._mount(target, anchor);
			insertNode(text_5, target, anchor);
			appendNode(text_6, accordion_2._slotted.default);
			accordion_2._mount(target, anchor);
			insertNode(text_7, target, anchor);
			appendNode(text_8, accordion_3._slotted.default);
			accordion_3._mount(target, anchor);
			insertNode(text_9, target, anchor);
			appendNode(text_10, accordion_4._slotted.default);
			accordion_4._mount(target, anchor);
			insertNode(text_11, target, anchor);
			appendNode(text_12, accordion_5._slotted.default);
			accordion_5._mount(target, anchor);
			insertNode(text_13, target, anchor);
			appendNode(text_14, accordion_6._slotted.default);
			accordion_6._mount(target, anchor);
			insertNode(text_15, target, anchor);
			appendNode(text_16, accordion_7._slotted.default);
			accordion_7._mount(target, anchor);
			insertNode(text_17, target, anchor);
			appendNode(text_18, accordion_8._slotted.default);
			accordion_8._mount(target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			accordion._unmount();
			detachNode(text_3);
			accordion_1._unmount();
			detachNode(text_5);
			accordion_2._unmount();
			detachNode(text_7);
			accordion_3._unmount();
			detachNode(text_9);
			accordion_4._unmount();
			detachNode(text_11);
			accordion_5._unmount();
			detachNode(text_13);
			accordion_6._unmount();
			detachNode(text_15);
			accordion_7._unmount();
			detachNode(text_17);
			accordion_8._unmount();
		},

		d: function destroy$$1() {
			accordion.destroy(false);
			accordion_1.destroy(false);
			accordion_2.destroy(false);
			accordion_3.destroy(false);
			accordion_4.destroy(false);
			accordion_5.destroy(false);
			accordion_6.destroy(false);
			accordion_7.destroy(false);
			accordion_8.destroy(false);
		}
	};
}

function Top_10_terms_to_know(options) {
	init(this, options);
	this._state = assign({}, options.data);

	if (!options._root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment$33(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(Top_10_terms_to_know.prototype, proto);

/* client/data/content/types-of-respirators.html generated by Svelte v1.41.3 */
function create_main_fragment$34(state, component) {
	var h1, text_1, text_2, ol, text_5, h6, text_7, img, text_8, img_1, text_9, img_2, text_10, h6_1, text_12, img_3, text_13, img_4, text_14, text_15, img_5, text_16, text_17, text_18, img_6, text_19, text_20, u, text_22, img_7, text_23, text_24, img_8, text_25, img_9, text_26, text_27, img_10, text_29, text_30, img_11, text_31, img_12, text_32, img_13, text_33, img_14, text_34, text_35;

	var accordion = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Overview" }
	});

	var accordion_1 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Particulate Respirators (APR)" }
	});

	var accordion_2 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Gas/Vapor Respirators (APR)" }
	});

	var accordion_3 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: {
			title: "Combination Particulate and Gas/Vapor Respirators (APR)"
		}
	});

	var accordion_4 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "PAPR (APR)" }
	});

	var accordion_5 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "SCBA" }
	});

	var accordion_6 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "SAR" }
	});

	var accordion_7 = new Accordion({
		_root: component._root,
		slots: { default: createFragment() },
		data: { title: "Escape Respirators" }
	});

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "Types of Respirators";
			text_1 = createText("\n\n");
			text_2 = createText("There are 2 main categories/types of respirators:\n");
			ol = createElement("ol");
			ol.innerHTML = "<li>Air-Purifying (e.g. particulate masks, gas/vapor masks, PAPRs)</li>\n \t<li>Atmosphere-Supplying (e.g. SCBA, SAR)</li>\n";
			text_5 = createText("\n");
			h6 = createElement("h6");
			h6.textContent = "Air-Purifying Respirators (or APRs)";
			text_7 = createText("\nIncludes particulate masks, gas/vapor masks, and Powered Air-Purifying Respirators (PAPRs).These use filters or sorbents to remove harmful substances from the air. They range from simple disposable masks to sophisticated devices. They do not supply oxygen and must not be used in oxygen-deficient atmospheres or in other atmospheres that are immediately dangerous to life or health (IDLH). Respirators in this family are rated as N, R, or P for protection against oils.\n\n");
			img = createElement("img");
			text_8 = createText(" ");
			img_1 = createElement("img");
			text_9 = createText(" ");
			img_2 = createElement("img");
			text_10 = createText("\n");
			h6_1 = createElement("h6");
			h6_1.textContent = "Atmosphere-Supplying Respirators";
			text_12 = createText("\nIncludes supplied-air respirators (SARs) and self-contained breathing apparatus (SCBA) units.These are designed to provide breathable air from a clean air source other than the surrounding contaminated work atmosphere.\n\n");
			img_3 = createElement("img");
			text_13 = createText(" ");
			img_4 = createElement("img");
			accordion._fragment.c();
			text_14 = createText("\n\n");
			text_15 = createText("Particulate respirators are a kind of air-purifying respirator. They filter out airborne particles, but not gases or vapors. They can also filter airborne biological agents (e.g. bacteria, viruses) since they are particles.*\nParticulate respirators can either be disposable or reusable/elastomeric. They are usually rated as N, R, or P for protection against oils.\n");
			img_5 = createElement("img");
			text_16 = createText("\n* Selection of respirators for infectious disease and terrorism-related exposures requires consideration of additional factors in addition to the traditional exposure assessment approaches described in this guidance. See the NIOSH respirator topic page http://www.cdc.gov/niosh/topics/respirators/ for additional information and guidance on particular infectious disease and terrorism issues.");
			accordion_1._fragment.c();
			text_17 = createText("\n\n");
			text_18 = createText("Gas (or vapor) respirators are a kind of tight-fitting air-purifying respirator. They filter chemical gases out of the air as you breathe using cartridge filters. Cartridge filters are specialized and must be selected according to the hazards faced. There is no \"all-in-one\" filter that protects against everything. The filters are usually rated as N, R, or P for protection against oils.\n\n");
			img_6 = createElement("img");
			accordion_2._fragment.c();
			text_19 = createText("\n\n");
			text_20 = createText("Combination respirators are a kind of ");
			u = createElement("u");
			u.textContent = "tight-fitting air-purifying respirator";
			text_22 = createText(". They use cartridge filter to filter out both airborne particles and gases as you breathe. Cartridge filters are specialized and must be selected according to the hazards faced. There is no \"all-in-one\" filter that protects against everything. The filters are usually rated as N, R, or P for protection against oils.\n\n");
			img_7 = createElement("img");
			accordion_3._fragment.c();
			text_23 = createText("\n\n");
			text_24 = createText("A Powered Air-Purifying Respirator (PAPR) can filter particulates, gases, or a combination. Powered air is pulled through the filters and then pushed into the user’s facepiece. There are many varieties of PAPRs, including loose-fitting full face, tight-fitting full face, or half-mask. It can include a helmet or hood.\n\n");
			img_8 = createElement("img");
			text_25 = createText(" ");
			img_9 = createElement("img");
			accordion_4._fragment.c();
			text_26 = createText("\n\n");
			text_27 = createText("A SCBA is a Self-Contained Breathing Apparatus. It is a kind of tight-fitting atmosphere-supplying respirator. Breathing air is supplied to the facepeice from a cylinder of compressed air. The cylinders are carried by the respirator user, often on the back. These respirators provide the highest level of respiratory protection.\n\n");
			img_10 = createElement("img");
			accordion_5._fragment.c();
			text_29 = createText("\n\n");
			text_30 = createText("A SAR is a Supplied-Air Respirator (or airline respirator). It is a kind of atmosphere-supplying respirator. Breathing air is supplied to the facepiece via an airline. The source of breathing air is not carried by the user.\n\n");
			img_11 = createElement("img");
			text_31 = createText(" ");
			img_12 = createElement("img");
			text_32 = createText(" ");
			img_13 = createElement("img");
			text_33 = createText(" ");
			img_14 = createElement("img");
			accordion_6._fragment.c();
			text_34 = createText("\n\n");
			text_35 = createText("A SAR is a Supplied-Air Respirator (or airline respirator). It is a kind of atmosphere-supplying respirator. Breathing air is supplied to the facepiece viaEscape respirators are only for emergency exits. They should allow a person working in a normally safe environment time to escape from sudden hazardous conditions. These respirators are selected based on the time needed to escape and the likelihood of IDLH or oxygen deficiency conditions, not specific APF ratings.\nEscape devices can be either APRs or SCBAs.\nan airline. The source of breathing air is not carried by the user.");
			accordion_7._fragment.c();
			this.h();
		},

		h: function hydrate() {
			img.src = "wp-images/FullfacemaskRespirator.jpg";
			img.alt = '';
			img.width = "165";
			img.height = "165";
			img_1.src = "wp-images/3m-full-face-respirators-masks-8246pa1-a-64_1000-300x300.jpg";
			img_1.alt = '';
			img_1.width = "239";
			img_1.height = "239";
			img_2.src = "wp-images/770030-2-300x232.jpg";
			img_2.alt = '';
			img_2.width = "239";
			img_2.height = "185";
			img_3.src = "wp-images/Комбинированный_СИЗОД_ШР_и_АДА-156x300.jpg";
			img_3.alt = '';
			img_3.width = "156";
			img_3.height = "300";
			img_4.src = "wp-images/FullFaceSAR-266x300.jpg";
			img_4.alt = '';
			img_4.width = "266";
			img_4.height = "300";
			img_5.src = "wp-images/HTB1qVk5JVXXXXcKXXXXq6xXFXXXi-300x300.jpg";
			img_5.alt = '';
			img_5.width = "300";
			img_5.height = "300";
			img_6.src = "wp-images/GasVaporRespirator.gif";
			img_6.alt = '';
			img_6.width = "117";
			img_6.height = "109";
			img_7.src = "wp-images/disposable-half-mask-series-5000-organic-gas-p2-particulates-ffa1-p2-rd-code-5174-675-p_1-288x300.jpg";
			img_7.alt = '';
			img_7.width = "288";
			img_7.height = "300";
			img_8.src = "wp-images/LoosePARP.jpg";
			img_8.alt = '';
			img_8.width = "199";
			img_8.height = "250";
			img_9.src = "wp-images/HoodLoosePARP.jpg";
			img_9.alt = '';
			img_9.width = "191";
			img_9.height = "250";
			img_10.src = "wp-images/OSHASCBA.jpg";
			img_10.alt = '';
			img_10.width = "197";
			img_10.height = "250";
			img_11.src = "wp-images/FullFaceSAR-266x300.jpg";
			img_11.alt = '';
			img_11.width = "266";
			img_11.height = "300";
			img_12.src = "wp-images/HalfFaceSAR-243x300.jpg";
			img_12.alt = '';
			img_12.width = "243";
			img_12.height = "300";
			img_13.src = "wp-images/HalfFaceSARwithHat.jpg";
			img_13.alt = '';
			img_13.width = "169";
			img_13.height = "150";
			img_14.src = "wp-images/OSHASAR.jpg";
			img_14.alt = '';
			img_14.width = "199";
			img_14.height = "250";
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			appendNode(text_2, accordion._slotted.default);
			appendNode(ol, accordion._slotted.default);
			appendNode(text_5, accordion._slotted.default);
			appendNode(h6, accordion._slotted.default);
			appendNode(text_7, accordion._slotted.default);
			appendNode(img, accordion._slotted.default);
			appendNode(text_8, accordion._slotted.default);
			appendNode(img_1, accordion._slotted.default);
			appendNode(text_9, accordion._slotted.default);
			appendNode(img_2, accordion._slotted.default);
			appendNode(text_10, accordion._slotted.default);
			appendNode(h6_1, accordion._slotted.default);
			appendNode(text_12, accordion._slotted.default);
			appendNode(img_3, accordion._slotted.default);
			appendNode(text_13, accordion._slotted.default);
			appendNode(img_4, accordion._slotted.default);
			accordion._mount(target, anchor);
			insertNode(text_14, target, anchor);
			appendNode(text_15, accordion_1._slotted.default);
			appendNode(img_5, accordion_1._slotted.default);
			appendNode(text_16, accordion_1._slotted.default);
			accordion_1._mount(target, anchor);
			insertNode(text_17, target, anchor);
			appendNode(text_18, accordion_2._slotted.default);
			appendNode(img_6, accordion_2._slotted.default);
			accordion_2._mount(target, anchor);
			insertNode(text_19, target, anchor);
			appendNode(text_20, accordion_3._slotted.default);
			appendNode(u, accordion_3._slotted.default);
			appendNode(text_22, accordion_3._slotted.default);
			appendNode(img_7, accordion_3._slotted.default);
			accordion_3._mount(target, anchor);
			insertNode(text_23, target, anchor);
			appendNode(text_24, accordion_4._slotted.default);
			appendNode(img_8, accordion_4._slotted.default);
			appendNode(text_25, accordion_4._slotted.default);
			appendNode(img_9, accordion_4._slotted.default);
			accordion_4._mount(target, anchor);
			insertNode(text_26, target, anchor);
			appendNode(text_27, accordion_5._slotted.default);
			appendNode(img_10, accordion_5._slotted.default);
			accordion_5._mount(target, anchor);
			insertNode(text_29, target, anchor);
			appendNode(text_30, accordion_6._slotted.default);
			appendNode(img_11, accordion_6._slotted.default);
			appendNode(text_31, accordion_6._slotted.default);
			appendNode(img_12, accordion_6._slotted.default);
			appendNode(text_32, accordion_6._slotted.default);
			appendNode(img_13, accordion_6._slotted.default);
			appendNode(text_33, accordion_6._slotted.default);
			appendNode(img_14, accordion_6._slotted.default);
			accordion_6._mount(target, anchor);
			insertNode(text_34, target, anchor);
			appendNode(text_35, accordion_7._slotted.default);
			accordion_7._mount(target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			accordion._unmount();
			detachNode(text_14);
			accordion_1._unmount();
			detachNode(text_17);
			accordion_2._unmount();
			detachNode(text_19);
			accordion_3._unmount();
			detachNode(text_23);
			accordion_4._unmount();
			detachNode(text_26);
			accordion_5._unmount();
			detachNode(text_29);
			accordion_6._unmount();
			detachNode(text_34);
			accordion_7._unmount();
		},

		d: function destroy$$1() {
			accordion.destroy(false);
			accordion_1.destroy(false);
			accordion_2.destroy(false);
			accordion_3.destroy(false);
			accordion_4.destroy(false);
			accordion_5.destroy(false);
			accordion_6.destroy(false);
			accordion_7.destroy(false);
		}
	};
}

function Types_of_respirators(options) {
	init(this, options);
	this._state = assign({}, options.data);

	if (!options._root) {
		this._oncreate = [];
		this._beforecreate = [];
		this._aftercreate = [];
	}

	this._fragment = create_main_fragment$34(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);

		this._lock = true;
		callAll(this._beforecreate);
		callAll(this._oncreate);
		callAll(this._aftercreate);
		this._lock = false;
	}
}

assign(Types_of_respirators.prototype, proto);

/* client/data/content/who-should-use-it.html generated by Svelte v1.41.3 */
function create_main_fragment$35(state, component) {
	var h1, text_1, ul, text_5, img, text_6;

	return {
		c: function create() {
			h1 = createElement("h1");
			h1.textContent = "Who Should Use It";
			text_1 = createText("\n\n");
			ul = createElement("ul");
			ul.innerHTML = "<li>Workers</li>\n \t<li>Employers</li>\n \t<li>Respirator program administrators</li>\n";
			text_5 = createText("\n");
			img = createElement("img");
			text_6 = createText("\n\nThis mobile app aims to make the process of choosing the correct respirator easier and faster.\n\nIt is based on the NIOSH Respirator Selection Logic (RSL). Like a logic flow diagram, or a “wizard,” each question helps to narrow down the available options.\n\n ");
			this.h();
		},

		h: function hydrate() {
			img.src = "wp-images/5838532293_65ed644884_z-300x233.jpg";
			img.alt = '';
			img.width = "336";
			img.height = "261";
		},

		m: function mount(target, anchor) {
			insertNode(h1, target, anchor);
			insertNode(text_1, target, anchor);
			insertNode(ul, target, anchor);
			insertNode(text_5, target, anchor);
			insertNode(img, target, anchor);
			insertNode(text_6, target, anchor);
		},

		p: noop,

		u: function unmount() {
			detachNode(h1);
			detachNode(text_1);
			detachNode(ul);
			detachNode(text_5);
			detachNode(img);
			detachNode(text_6);
		},

		d: noop
	};
}

function Who_should_use_it(options) {
	init(this, options);
	this._state = assign({}, options.data);

	this._fragment = create_main_fragment$35(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);
	}
}

assign(Who_should_use_it.prototype, proto);

var staticHtmlFiles = [{ path: 'client/data/content/1910-134-a-permissible-practice.html', export: _1910_134_a_permissible_practice }, { path: 'client/data/content/1910-134b-definitions.html', export: _1910_134b_definitions }, { path: 'client/data/content/1910-134c-respiratory-protection-program.html', export: _1910_134c_respiratory_protection_program }, { path: 'client/data/content/1910-134d-selection-of-respirators.html', export: _1910_134d_selection_of_respirators }, { path: 'client/data/content/1910-134e-medical-evaluation.html', export: _1910_134e_medical_evaluation }, { path: 'client/data/content/1910-134f-fit-testing.html', export: _1910_134f_fit_testing }, { path: 'client/data/content/1910-134g-use-of-respirators.html', export: _1910_134g_use_of_respirators }, { path: 'client/data/content/1910-134h-maintenance-and-care-of-respirators.html', export: _1910_134h_maintenance_and_care_of_respirators }, { path: 'client/data/content/1910-134i-breathing-air-quality-and-use.html', export: _1910_134i_breathing_air_quality_and_use }, { path: 'client/data/content/1910-134j-identification-of-filters-cartridges-and-canisters.html', export: _1910_134j_identification_of_filters_cartridges_and_canisters }, { path: 'client/data/content/1910-134k-training-and-information.html', export: _1910_134k_training_and_information }, { path: 'client/data/content/1910-134l-program-evaluation.html', export: _1910_134l_program_evaluation }, { path: 'client/data/content/1910-134m-recordkeeping.html', export: _1910_134m_recordkeeping }, { path: 'client/data/content/1910-134n-effective-date.html', export: _1910_134n_effective_date }, { path: 'client/data/content/1910-134o-appendices.html', export: _1910_134o_appendices }, { path: 'client/data/content/acronyms.html', export: Acronyms }, { path: 'client/data/content/before-you-start.html', export: Before_you_start }, { path: 'client/data/content/caring-for-your-respirator.html', export: Caring_for_your_respirator }, { path: 'client/data/content/conversion-tables.html', export: Conversion_tables }, { path: 'client/data/content/employer-responsibilites.html', export: Employer_responsibilites }, { path: 'client/data/content/fit-testing.html', export: Fit_testing }, { path: 'client/data/content/glossary.html', export: Glossary }, { path: 'client/data/content/how-to-use-it.html', export: How_to_use_it }, { path: 'client/data/content/osha-standards.html', export: Osha_standards }, { path: 'client/data/content/purpose-of-respirators.html', export: Purpose_of_respirators }, { path: 'client/data/content/resources.html', export: Resources }, { path: 'client/data/content/respirator-characteristics.html', export: Respirator_characteristics }, { path: 'client/data/content/respirator-safety.html', export: Respirator_safety }, { path: 'client/data/content/top-10-terms-to-know.html', export: Top_10_terms_to_know }, { path: 'client/data/content/types-of-respirators.html', export: Types_of_respirators }, { path: 'client/data/content/who-should-use-it.html', export: Who_should_use_it }];

var pathToId = (function (path) {
  return path.match(/\/([^/]+)\.html$/)[1];
});

var idToComponent = staticHtmlFiles.reduce(function (acc, _ref) {
	var path = _ref.path,
	    component = _ref.export;

	var id = pathToId(path);
	var name = idToName[id];

	acc[id] = {
		id: id,
		component: component,
		name: name
	};

	return acc;
}, Object.create(null));

var client$47$routes$47$app$47$content$47$content$46$js = (function () {
	return {
		name: 'app.content',
		route: '/content/:id(.+)',
		template: Content,
		resolve: function resolve(data, params) {
			var page = idToComponent[params.id];

			if (!page) {
				return Promise.reject({
					redirectTo: {
						name: 'app.not-found',
						params: {
							route: '/static/' + params.id
						}
					}
				});
			}

			var component = page.component;


			return Promise.resolve({
				component: component
			});
		}
	};
});

/* client/routes/app/not-found/NotFound.html generated by Svelte v1.41.3 */
function create_main_fragment$36(state, component) {
	var div, h1, text_1;

	var if_block = state.route && create_if_block(state, component);

	return {
		c: function create() {
			div = createElement("div");
			h1 = createElement("h1");
			h1.textContent = "Not Found";
			text_1 = createText("\n\t");
			if (if_block) if_block.c();
		},

		m: function mount(target, anchor) {
			insertNode(div, target, anchor);
			appendNode(h1, div);
			appendNode(text_1, div);
			if (if_block) if_block.m(div, null);
		},

		p: function update(changed, state) {
			if (state.route) {
				if (if_block) {
					if_block.p(changed, state);
				} else {
					if_block = create_if_block(state, component);
					if_block.c();
					if_block.m(div, null);
				}
			} else if (if_block) {
				if_block.u();
				if_block.d();
				if_block = null;
			}
		},

		u: function unmount() {
			detachNode(div);
			if (if_block) if_block.u();
		},

		d: function destroy$$1() {
			if (if_block) if_block.d();
		}
	};
}

// (7:2) {{#if parameters}}
function create_if_block_1(state, component) {
	var text, code, text_1;

	return {
		c: function create() {
			text = createText("with parameters ");
			code = createElement("code");
			text_1 = createText(state.parameters);
		},

		m: function mount(target, anchor) {
			insertNode(text, target, anchor);
			insertNode(code, target, anchor);
			appendNode(text_1, code);
		},

		p: function update(changed, state) {
			if (changed.parameters) {
				text_1.data = state.parameters;
			}
		},

		u: function unmount() {
			detachNode(text);
			detachNode(code);
		},

		d: noop
	};
}

// (5:1) {{#if route}}
function create_if_block(state, component) {
	var p, text, code, text_1, text_2;

	var if_block = state.parameters && create_if_block_1(state, component);

	return {
		c: function create() {
			p = createElement("p");
			text = createText("No route for ");
			code = createElement("code");
			text_1 = createText(state.route);
			text_2 = createText("\n\t\t");
			if (if_block) if_block.c();
		},

		m: function mount(target, anchor) {
			insertNode(p, target, anchor);
			appendNode(text, p);
			appendNode(code, p);
			appendNode(text_1, code);
			appendNode(text_2, p);
			if (if_block) if_block.m(p, null);
		},

		p: function update(changed, state) {
			if (changed.route) {
				text_1.data = state.route;
			}

			if (state.parameters) {
				if (if_block) {
					if_block.p(changed, state);
				} else {
					if_block = create_if_block_1(state, component);
					if_block.c();
					if_block.m(p, null);
				}
			} else if (if_block) {
				if_block.u();
				if_block.d();
				if_block = null;
			}
		},

		u: function unmount() {
			detachNode(p);
			if (if_block) if_block.u();
		},

		d: function destroy$$1() {
			if (if_block) if_block.d();
		}
	};
}

function NotFound(options) {
	init(this, options);
	this._state = assign({}, options.data);

	this._fragment = create_main_fragment$36(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);
	}
}

assign(NotFound.prototype, proto);

var client$47$routes$47$app$47$not$45$found$47$not$45$found$46$js = (function () {
	return {
		name: 'app.not-found',
		route: 'not-found',
		querystringParameters: ['route', 'parameters'],
		template: NotFound,
		resolve: function resolve(data, params) {
			var route = params.route,
			    parameters = params.parameters;


			return Promise.resolve({ route: route, parameters: parameters });
		}
	};
});

/* client/routes/app/respirator-picker/RespiratorPicker.html generated by Svelte v1.41.3 */
function create_main_fragment$37(state, component) {
	var div;

	return {
		c: function create() {
			div = createElement("div");
			this.h();
		},

		h: function hydrate() {
			div.className = "respirator-picker";
		},

		m: function mount(target, anchor) {
			insertNode(div, target, anchor);
			div.innerHTML = state.html;
		},

		p: function update(changed, state) {
			if (changed.html) {
				div.innerHTML = state.html;
			}
		},

		u: function unmount() {
			div.innerHTML = '';

			detachNode(div);
		},

		d: noop
	};
}

function RespiratorPicker(options) {
	init(this, options);
	this._state = assign({}, options.data);

	this._fragment = create_main_fragment$37(this._state, this);

	if (options.target) {
		this._fragment.c();
		this._fragment.m(options.target, options.anchor || null);
	}
}

assign(RespiratorPicker.prototype, proto);

var start$1 = "6";
var decisions$1 = { "1": "<p>Conditions are considered to be Immediately Dangerous to Life or Health (IDLH). You should use either:\nA pressure-demand, full-facepiece SCBA or\nA pressure-demand, full-facepiece SAR in combination with an auxiliary pressure-demand, full-facepiece SCBA<sup>*</sup>.</p>\n<ul>\n<li><a href=\"118\">Show Respirator Options</a></li>\n</ul>\n<hr>\n<p><sup>*</sup>The auxiliary SCBA must be of sufficient duration to permit escape to safety if the air supply is interrupted. An auxiliary unit means that the SAR unit includes a separate air bottle to provide a reserve source of air should the airline become damaged. The auxiliary unit shares the same mask and regulator, and enables the SAR to function as an SCBA if needed.</p>\n", "2": "<p>You should use either:\nA pressure-demand self-contained breathing apparatus (SCBA)� with a full facepiece,\nOr a pressure-demand supplied-air respirator (SAR) with a full facepiece in combination with an auxiliary pressure-demand SCBA<sup>*</sup>.</p>\n<ul>\n<li><a href=\"117\">Show Respirator Options</a></li>\n</ul>\n<hr>\n<p><sup>*</sup>The auxiliary SCBA must be of sufficient duration to permit escape to safety if the air supply is interrupted. An auxiliary unit means that the SAR unit includes a separate air bottle to provide a reserve source of air should the airline become damaged. The auxiliary unit shares the same mask and regulator, and enables the SAR to function as an SCBA if needed.</p>\n", "3": "<p>Will you use the respirator in an unknown or IDLH<sup>*</sup> atmosphere?  For example, an emergency situation?</p>\n<ul>\n<li><a href=\"2\">Yes</a></li>\n<li><a href=\"12\">No</a></li>\n</ul>\n<hr>\n<p><sup>*</sup>Immediately dangerous to life or health (IDLH) means an atmosphere that poses an immediate threat to life, would cause irreversible adverse health effects, or would impair an individual's ability to escape from a dangerous atmosphere.</p>\n", "4": "<p>Will you use the respirator in an oxygen-deficient<sup>*</sup> atmosphere?</p>\n<ul>\n<li><a href=\"7\">Yes</a></li>\n<li><a href=\"3\">No</a></li>\n</ul>\n<hr>\n<p><sup>*</sup>Oxygen deficient is less than 19.5% oxygen.</p>\n", "5": "<p>You should wear: A full-facepiece, pressure-demand, self-contained breathing apparatus (SCBA)<sup>*</sup>.</p>\n<ul>\n<li><a href=\"114\">Show Respirator Options</a></li>\n</ul>\n<hr>\n<p><sup>*</sup>Must meet the requirement of the NFPA 1981, Standard on Open-circuit Self-contained Breathing Apparatus for Fire and Emergency Services (2002 edition).</p>\n", "6": "<p>Will you use the respirator for fire fighting?</p>\n<ul>\n<li><a href=\"5\">Yes</a></li>\n<li><a href=\"4\">No</a></li>\n</ul>\n", "7": "<p>Are there contaminants present?</p>\n<ul>\n<li><a href=\"8\">Yes</a></li>\n<li><a href=\"9\">No</a></li>\n</ul>\n", "8": "<p>Will you use the respirator in an unknown or IDLH<sup>*</sup> atmosphere?  For example, an emergency situation?</p>\n<ul>\n<li><a href=\"10\">Yes</a></li>\n<li><a href=\"11\">No</a></li>\n</ul>\n<hr>\n<p><sup>*</sup>Immediately dangerous to life or health (IDLH) means an atmosphere that poses an immediate threat to life, would cause irreversible adverse health effects, or would impair an individual's ability to escape from a dangerous atmosphere.</p>\n", "9": "<p><a href=\"115\">Show Respirator Option</a></p>\n", "10": "<p>You should use either:\nA pressure-demand self-contained breathing apparatus (SCBA) with a full facepiece,\nOr a pressure-demand supplied-air respirator (SAR) with a full facepiece in combination with an auxiliary pressure-demand SCBA<sup>*</sup>.</p>\n<ul>\n<li><a href=\"116\">Show Respirator Options</a></li>\n</ul>\n<hr>\n<p><sup>*</sup>The auxiliary SCBA must be of sufficient duration to permit escape to safety if the air supply is interrupted. An auxiliary unit means that the SAR unit includes a separate air bottle to provide a reserve source of air should the airline become damaged. The auxiliary unit shares the same mask and regulator, and enables the SAR to function as an SCBA if needed.</p>\n", "11": "<p>In your work space is the exposure concentration<sup>*</sup> of the contaminants less than the NIOSH REL or other applicable exposure limit<sup>†</sup>?</p>\n<ul>\n<li><a href=\"13\">Yes</a></li>\n<li><a href=\"15\">No</a></li>\n</ul>\n<hr>\n<p><sup>*</sup>Before you can answer this question, you will need to collect data on the concentration of contaminants in the atmosphere in your work space. See TWA in the Glossary.</p>\n<p><sup>†</sup>Use the Chemical Lookup Tool tab below to find the exposure limit for the contaminant. The NIOSH Recommended Exposure Limit is a non-mandatory, recommended occupational exposure limit.</p>\n", "12": "<p>In your work space is the exposure concentration<sup>*</sup> of the contaminants less than the NIOSH REL or other applicable exposure limit<sup>†</sup>?</p>\n<ul>\n<li><a href=\"14\">Yes</a></li>\n<li><a href=\"16\">No</a></li>\n</ul>\n<hr>\n<p><sup>*</sup>Before you can answer this question, you will need to collect data on the concentration of contaminants in the atmosphere in your work space. See TWA in the Glossary.</p>\n<p><sup>†</sup>Use the Chemical Lookup Tool tab below to find the exposure limit for the contaminant. The NIOSH Recommended Exposure Limit is a non-mandatory, recommended occupational exposure limit.</p>\n", "13": "<p>Is the contaminant an eye irritant, or can the contaminant cause eye damage at the workplace concentration<sup>*</sup>?</p>\n<ul>\n<li><a href=\"20\">Yes</a></li>\n<li><a href=\"21\">No</a></li>\n</ul>\n<hr>\n<p><sup>*</sup>Information on eye irritation is included in the Chemical Lookup Tool tab and may also be found in the International Chemical Safety Cards put out by the International Programme on Chemical Safety (<a href=\"https://www.cdc.gov/niosh/ipcs/\">https://www.cdc.gov/niosh/ipcs/</a>).</p>\n", "14": "<p>Is the contaminant an eye irritant, or can the contaminant cause eye damage at the workplace concentration<sup>*</sup>?</p>\n<ul>\n<li><a href=\"26\">Yes</a></li>\n<li><a href=\"27\">No</a></li>\n</ul>\n<hr>\n<p><sup>*</sup>Information on eye irritation is included in the Chemical Lookup Tool tab and may also be found in the International Chemical Safety Cards put out by the International Programme on Chemical Safety (<a href=\"https://www.cdc.gov/niosh/ipcs/\">https://www.cdc.gov/niosh/ipcs/</a>).</p>\n", "15": "<p>Are conditions such that the respirator user can escape from the work area and not suffer loss of life or immediate or delayed irreversible health effects if the respirator fails? That is, are the conditions not immediately dangerous to life or health (IDLH)<sup>*</sup>?</p>\n<ul>\n<li><a href=\"1\">No. Conditions are considered IDLH.</a></li>\n<li><a href=\"18\">Yes. Conditions are not IDLH. Proceed to Step 6</a></li>\n</ul>\n<hr>\n<p><sup>*</sup>IDLH values for certain compounds are found in the Chemical Lookup Tool tab, or the NIOSH Pocket Guide for Chemical Hazards (<a href=\"https://www.cdc.gov/niosh/npg/\">https://www.cdc.gov/niosh/npg/</a>). IDLH values for some substances can also be found here (<a href=\"https://www.cdc.gov/niosh/idlh/\">https://www.cdc.gov/niosh/idlh/</a>).</p>\n", "16": "<p>Are conditions such that the respirator user can escape from the work area and not suffer loss of life or immediate or delayed irreversible health effects if the respirator fails? That is, are the conditions not immediately dangerous to life or health (IDLH)<sup>*</sup>?</p>\n<ul>\n<li><a href=\"17\">No. Conditions are considered IDLH.</a></li>\n<li><a href=\"19\">Yes. Conditions are not IDLH. Proceed to Step 6</a></li>\n</ul>\n<hr>\n<p><sup>*</sup>IDLH values for certain compounds are found in the Chemical Lookup Tool tab, or the NIOSH Pocket Guide for Chemical Hazards (<a href=\"https://www.cdc.gov/niosh/npg/\">https://www.cdc.gov/niosh/npg/</a>). IDLH values for some substances can also be found here (<a href=\"https://www.cdc.gov/niosh/idlh/\">https://www.cdc.gov/niosh/idlh/</a>).</p>\n", "17": "<p>Conditions are considered to be Immediately Dangerous to Life or Health (IDLH). You should use either:\nA pressure-demand, full-facepiece SCBA or\nA pressure-demand, full-facepiece SAR in combination with an auxiliary pressure-demand, full-facepiece SCBA<sup>*</sup>.</p>\n<ul>\n<li><a href=\"119\">Show Respirator Options</a></li>\n</ul>\n<hr>\n<p><sup>*</sup>The auxiliary SCBA must be of sufficient duration to permit escape to safety if the air supply is interrupted. An auxiliary unit means that the SAR unit includes a separate air bottle to provide a reserve source of air should the airline become damaged. The auxiliary unit shares the same mask and regulator, and enables the SAR to function as an SCBA if needed.</p>\n", "18": "<p>Is the contaminant an eye irritant, or can the contaminant cause eye damage at the workplace concentration<sup>*</sup>?</p>\n<ul>\n<li><a href=\"22\">Yes</a></li>\n<li><a href=\"23\">No</a></li>\n</ul>\n<hr>\n<p><sup>*</sup>Information on eye irritation is included in the Chemical Lookup Tool tab and may also be found in the International Chemical Safety Cards put out by the International Programme on Chemical Safety (<a href=\"https://www.cdc.gov/niosh/ipcs/\">https://www.cdc.gov/niosh/ipcs/</a>).</p>\n", "19": "<p>Is the contaminant an eye irritant, or can the contaminant cause eye damage at the workplace concentration<sup>*</sup>?</p>\n<ul>\n<li><a href=\"24\">Yes</a></li>\n<li><a href=\"25\">No</a></li>\n</ul>\n<hr>\n<p><sup>*</sup>Information on eye irritation is included in the Chemical Lookup Tool tab and may also be found in the International Chemical Safety Cards put out by the International Programme on Chemical Safety (<a href=\"https://www.cdc.gov/niosh/ipcs/\">https://www.cdc.gov/niosh/ipcs/</a>).</p>\n", "20": "<p>Use the table below showing values from the Chemical Lookup and My Info tools. Determine if the maximum hazard ratio (HR) is greater than 1. The Hazard Ratio is the Concentration ÷ the Limit, as shown in the last column. See further below for more details on calculations.</p>\n<ul>\n<li><a href=\"28\">Yes</a></li>\n<li><a href=\"29\">No</a></li>\n</ul>\n<hr>\n<p>To calculate the maximum hazard ratio:</p>\n<ul>\n<li>Divide the time-weighted average (TWA) exposure concentration for the contaminant determined in Step 4 by the NIOSH REL or other applicable exposure limit. If the exposure limit is an 8 hour limit the TWA used must be on 8 hour average. If the exposure limit is based on 10 hours, use a 10 hour TWA.</li>\n<li>If the contaminant has a ceiling limit, divide the maximum exposure concentration for the contaminant determined in Step 4 by the ceiling limit.</li>\n<li>If the contaminant has a short term exposure limit (STEL), divide the maximum 15 min TWA exposure concentration for the contaminant determined in Step 4 by the STEL.</li>\n</ul>\n", "21": "<p>Use the table below showing values from the Chemical Lookup and My Info tools. Determine if the maximum hazard ratio (HR) is greater than 1. The Hazard Ratio is the Concentration ÷ the Limit, as shown in the last column. See further below for more details on calculations.</p>\n<ul>\n<li><a href=\"30\">Yes</a></li>\n<li><a href=\"31\">No</a></li>\n</ul>\n<hr>\n<p>To calculate the maximum hazard ratio:</p>\n<ul>\n<li>Divide the time-weighted average (TWA) exposure concentration for the contaminant determined in Step 4 by the NIOSH REL or other applicable exposure limit. If the exposure limit is an 8 hour limit the TWA used must be on 8 hour average. If the exposure limit is based on 10 hours, use a 10 hour TWA.</li>\n<li>If the contaminant has a ceiling limit, divide the maximum exposure concentration for the contaminant determined in Step 4 by the ceiling limit.</li>\n<li>If the contaminant has a short term exposure limit (STEL), divide the maximum 15 min TWA exposure concentration for the contaminant determined in Step 4 by the STEL.</li>\n</ul>\n", "22": "<p>Use the table below showing values from the Chemical Lookup and My Info tools. Determine if the maximum hazard ratio (HR) is greater than 1. The Hazard Ratio is the Concentration ÷ the Limit, as shown in the last column. See further below for more details on calculations.</p>\n<ul>\n<li><a href=\"32\">No</a></li>\n<li><a href=\"33\">Yes</a></li>\n</ul>\n<hr>\n<p>To calculate the maximum hazard ratio:</p>\n<ul>\n<li>Divide the time-weighted average (TWA) exposure concentration for the contaminant determined in Step 4 by the NIOSH REL or other applicable exposure limit. If the exposure limit is an 8 hour limit the TWA used must be on 8 hour average. If the exposure limit is based on 10 hours, use a 10 hour TWA.</li>\n<li>If the contaminant has a ceiling limit, divide the maximum exposure concentration for the contaminant determined in Step 4 by the ceiling limit.</li>\n<li>If the contaminant has a short term exposure limit (STEL), divide the maximum 15 min TWA exposure concentration for the contaminant determined in Step 4 by the STEL.</li>\n</ul>\n", "23": "<p>Use the table below showing values from the Chemical Lookup and My Info tools. Determine if the maximum hazard ratio (HR) is greater than 1. The Hazard Ratio is the Concentration ÷ the Limit, as shown in the last column. See further below for more details on calculations.</p>\n<ul>\n<li><a href=\"34\">No</a></li>\n<li><a href=\"35\">Yes</a></li>\n</ul>\n<hr>\n<p>To calculate the maximum hazard ratio:</p>\n<ul>\n<li>Divide the time-weighted average (TWA) exposure concentration for the contaminant determined in Step 4 by the NIOSH REL or other applicable exposure limit. If the exposure limit is an 8 hour limit the TWA used must be on 8 hour average. If the exposure limit is based on 10 hours, use a 10 hour TWA.</li>\n<li>If the contaminant has a ceiling limit, divide the maximum exposure concentration for the contaminant determined in Step 4 by the ceiling limit.</li>\n<li>If the contaminant has a short term exposure limit (STEL), divide the maximum 15 min TWA exposure concentration for the contaminant determined in Step 4 by the STEL.</li>\n</ul>\n", "24": "<p>Use the table below showing values from the Chemical Lookup and My Info tools. Determine if the maximum hazard ratio (HR) is greater than 1. The Hazard Ratio is the Concentration ÷ the Limit, as shown in the last column. See further below for more details on calculations.</p>\n<ul>\n<li><a href=\"36\">No</a></li>\n<li><a href=\"37\">Yes</a></li>\n</ul>\n<hr>\n<p>To calculate the maximum hazard ratio:</p>\n<ul>\n<li>Divide the time-weighted average (TWA) exposure concentration for the contaminant determined in Step 4 by the NIOSH REL or other applicable exposure limit. If the exposure limit is an 8 hour limit the TWA used must be on 8 hour average. If the exposure limit is based on 10 hours, use a 10 hour TWA.</li>\n<li>If the contaminant has a ceiling limit, divide the maximum exposure concentration for the contaminant determined in Step 4 by the ceiling limit.</li>\n<li>If the contaminant has a short term exposure limit (STEL), divide the maximum 15 min TWA exposure concentration for the contaminant determined in Step 4 by the STEL.</li>\n</ul>\n", "25": "<p>Step 7A. Use the table below showing values from the Chemical Lookup and My Info tools. Determine if the maximum hazard ratio (HR) is greater than 1. The Hazard Ratio is the Concentration ÷ the Limit, as shown in the last column. See further below for more details on calculations.</p>\n<ul>\n<li><a href=\"38\">No</a></li>\n<li><a href=\"39\">Yes</a></li>\n</ul>\n<hr>\n<p>To calculate the maximum hazard ratio:</p>\n<ul>\n<li>Divide the time-weighted average (TWA) exposure concentration for the contaminant determined in Step 4 by the NIOSH REL or other applicable exposure limit. If the exposure limit is an 8 hour limit the TWA used must be on 8 hour average. If the exposure limit is based on 10 hours, use a 10 hour TWA.</li>\n<li>If the contaminant has a ceiling limit, divide the maximum exposure concentration for the contaminant determined in Step 4 by the ceiling limit.</li>\n<li>If the contaminant has a short term exposure limit (STEL), divide the maximum 15 min TWA exposure concentration for the contaminant determined in Step 4 by the STEL.</li>\n</ul>\n", "26": "<p>Use the table below showing values from the Chemical Lookup and My Info tools. Determine if the maximum hazard ratio (HR) is greater than 1. The Hazard Ratio is the Concentration ÷ the Limit, as shown in the last column. See further below for more details on calculations.</p>\n<ul>\n<li><a href=\"40\">Yes</a></li>\n<li><a href=\"41\">No</a></li>\n</ul>\n<hr>\n<p>To calculate the maximum hazard ratio:</p>\n<ul>\n<li>Divide the time-weighted average (TWA) exposure concentration for the contaminant determined in Step 4 by the NIOSH REL or other applicable exposure limit. If the exposure limit is an 8 hour limit the TWA used must be on 8 hour average. If the exposure limit is based on 10 hours, use a 10 hour TWA.</li>\n<li>If the contaminant has a ceiling limit, divide the maximum exposure concentration for the contaminant determined in Step 4 by the ceiling limit.</li>\n<li>If the contaminant has a short term exposure limit (STEL), divide the maximum 15 min TWA exposure concentration for the contaminant determined in Step 4 by the STEL.</li>\n</ul>\n", "27": "<p>Use the table below showing values from the Chemical Lookup and My Info tools. Determine if the maximum hazard ratio (HR) is greater than 1. The Hazard Ratio is the Concentration ÷ the Limit, as shown in the last column. See further below for more details on calculations.</p>\n<ul>\n<li><a href=\"42\">Yes</a></li>\n<li><a href=\"43\">No</a></li>\n</ul>\n<hr>\n<p>To calculate the maximum hazard ratio:</p>\n<ul>\n<li>Divide the time-weighted average (TWA) exposure concentration for the contaminant determined in Step 4 by the NIOSH REL or other applicable exposure limit. If the exposure limit is an 8 hour limit the TWA used must be on 8 hour average. If the exposure limit is based on 10 hours, use a 10 hour TWA.</li>\n<li>If the contaminant has a ceiling limit, divide the maximum exposure concentration for the contaminant determined in Step 4 by the ceiling limit.</li>\n<li>If the contaminant has a short term exposure limit (STEL), divide the maximum 15 min TWA exposure concentration for the contaminant determined in Step 4 by the STEL.</li>\n</ul>\n", "28": "<p>&quot;Oops. This answer is inconsistent. Double check Step 4 (Contamination Concentration).&quot;</p>\n<ul>\n<li><a href=\"20\">Okay</a></li>\n</ul>\n", "29": "<p>For escape respirators, is there potential for generation of a hazardous condition caused by an accident or equipment failure?</p>\n<ul>\n<li><a href=\"120\">Yes</a></li>\n<li><a href=\"121\">No</a></li>\n</ul>\n", "30": "<p>&quot;Oops. This answer is inconsistent. Double check Step 4 (Contamination Concentration).&quot;</p>\n<ul>\n<li><a href=\"21\">Okay</a></li>\n</ul>\n", "31": "<p>For escape respirators, is there potential for generation of a hazardous condition caused by an accident or equipment failure?</p>\n<ul>\n<li><a href=\"122\">Yes</a></li>\n<li><a href=\"123\">No</a></li>\n</ul>\n", "32": "<p>&quot;Oops. This answer is inconsistent. Double check Step 4 (Contamination Concentration).&quot;</p>\n<ul>\n<li><a href=\"22\">Okay</a></li>\n</ul>\n", "33": "<p>For escape respirators, is there potential for generation of a hazardous condition caused by an accident or equipment failure?</p>\n<ul>\n<li><a href=\"44\">Yes</a></li>\n<li><a href=\"45\">No</a></li>\n</ul>\n", "34": "<p>&quot;Oops. This answer is inconsistent. Double check Step 4 (Contamination Concentration).&quot;</p>\n<ul>\n<li><a href=\"23\">Okay</a></li>\n</ul>\n", "35": "<p>For escape respirators, is there potential for generation of a hazardous condition caused by an accident or equipment failure?</p>\n<ul>\n<li><a href=\"46\">Yes</a></li>\n<li><a href=\"47\">No</a></li>\n</ul>\n", "36": "<p>&quot;Oops. This answer is inconsistent. Double check Step 4 (Contamination Concentration).&quot;</p>\n<ul>\n<li><a href=\"24\">Okay</a></li>\n</ul>\n", "37": "<p>For escape respirators, is there potential for generation of a hazardous condition caused by an accident or equipment failure?</p>\n<ul>\n<li><a href=\"48\">Yes</a></li>\n<li><a href=\"49\">No</a></li>\n</ul>\n", "38": "<p>&quot;Oops. This answer is inconsistent. Double check Step 4 (Contamination Concentration).&quot;</p>\n<ul>\n<li><a href=\"25\">Okay</a></li>\n</ul>\n", "39": "<p>For escape respirators, is there potential for generation of a hazardous condition caused by an accident or equipment failure?</p>\n<ul>\n<li><a href=\"50\">Yes</a></li>\n<li><a href=\"51\">No</a></li>\n</ul>\n", "40": "<p>&quot;Oops. This answer is inconsistent. Double check Step 4 (Contamination Concentration).&quot;</p>\n<ul>\n<li><a href=\"26\">Okay</a></li>\n</ul>\n", "41": "<p>For escape respirators, is there potential for generation of a hazardous condition caused by an accident or equipment failure?</p>\n<ul>\n<li><a href=\"52\">Yes</a></li>\n<li><a href=\"148\">No</a></li>\n</ul>\n", "42": "<p>&quot;Oops. This answer is inconsistent. Double check Step 4 (Contamination Concentration).&quot;</p>\n<ul>\n<li><a href=\"27\">Okay</a></li>\n</ul>\n", "43": "<p>For escape respirators, is there potential for generation of a hazardous condition caused by an accident or equipment failure?</p>\n<ul>\n<li><a href=\"53\">Yes</a></li>\n<li><a href=\"152\">No</a></li>\n</ul>\n", "44": "<p>If the physical state of the contaminant is:\na particulate (solid or liquid aerosol) during periods of respirator use, proceed to Step 9;\na gas or vapor, proceed to Step 10;\na combination of gas or vapor and particulate, proceed to Step 11.</p>\n<ul>\n<li><a href=\"54\">Particulate</a></li>\n<li><a href=\"55\">Gas or Vapor</a></li>\n<li><a href=\"56\">Combination</a></li>\n</ul>\n", "45": "<p>If the physical state of the contaminant is:\na particulate (solid or liquid aerosol) during periods of respirator use, proceed to Step 9;\na gas or vapor, proceed to Step 10;\na combination of gas or vapor and particulate, proceed to Step 11.</p>\n<ul>\n<li><a href=\"57\">Particulate</a></li>\n<li><a href=\"58\">Gas or Vapor</a></li>\n<li><a href=\"59\">Combination</a></li>\n</ul>\n", "46": "<p>If the physical state of the contaminant is:\na particulate (solid or liquid aerosol) during periods of respirator use, proceed to Step 9;\na gas or vapor, proceed to Step 10;\na combination of gas or vapor and particulate, proceed to Step 11.</p>\n<ul>\n<li><a href=\"60\">Particulate</a></li>\n<li><a href=\"61\">Gas or Vapor</a></li>\n<li><a href=\"62\">Combination</a></li>\n</ul>\n", "47": "<p>If the physical state of the contaminant is:\na particulate (solid or liquid aerosol) during periods of respirator use, proceed to Step 9;\na gas or vapor, proceed to Step 10;\na combination of gas or vapor and particulate, proceed to Step 11.</p>\n<ul>\n<li><a href=\"63\">Particulate</a></li>\n<li><a href=\"64\">Gas or Vapor</a></li>\n<li><a href=\"65\">Combination</a></li>\n</ul>\n", "48": "<p>If the physical state of the contaminant is:\na particulate (solid or liquid aerosol) during periods of respirator use, proceed to Step 9;\na gas or vapor, proceed to Step 10;\na combination of gas or vapor and particulate, proceed to Step 11.</p>\n<ul>\n<li><a href=\"78\">Particulate</a></li>\n<li><a href=\"79\">Gas or Vapor</a></li>\n<li><a href=\"80\">Combination</a></li>\n</ul>\n", "49": "<p>If the physical state of the contaminant is:\na particulate (solid or liquid aerosol) during periods of respirator use, proceed to Step 9;\na gas or vapor, proceed to Step 10;\na combination of gas or vapor and particulate, proceed to Step 11.</p>\n<ul>\n<li><a href=\"81\">Particulate</a></li>\n<li><a href=\"82\">Gas or Vapor</a></li>\n<li><a href=\"83\">Combination</a></li>\n</ul>\n", "50": "<p>If the physical state of the contaminant is:\na particulate (solid or liquid aerosol) during periods of respirator use, proceed to Step 9;\na gas or vapor, proceed to Step 10;\na combination of gas or vapor and particulate, proceed to Step 11.</p>\n<ul>\n<li><a href=\"87\">Particulate</a></li>\n<li><a href=\"88\">Gas or Vapor</a></li>\n<li><a href=\"89\">Combination</a></li>\n</ul>\n", "51": "<p>If the physical state of the contaminant is:\na particulate (solid or liquid aerosol) during periods of respirator use, proceed to Step 9;\na gas or vapor, proceed to Step 10;\na combination of gas or vapor and particulate, proceed to Step 11.</p>\n<ul>\n<li><a href=\"84\">Particulate</a></li>\n<li><a href=\"85\">Gas or Vapor</a></li>\n<li><a href=\"86\">Combination</a></li>\n</ul>\n", "52": "<p>If the physical state of the contaminant is:\na particulate (solid or liquid aerosol) during periods of respirator use, proceed to Step 9;\na gas or vapor, proceed to Step 10;\na combination of gas or vapor and particulate, proceed to Step 11.</p>\n<ul>\n<li><a href=\"102\">Particulate</a></li>\n<li><a href=\"103\">Gas or Vapor</a></li>\n<li><a href=\"104\">Combination</a></li>\n</ul>\n", "53": "<p>If the physical state of the contaminant is:\na particulate (solid or liquid aerosol) during periods of respirator use, proceed to Step 9;\na gas or vapor, proceed to Step 10;\na combination of gas or vapor and particulate, proceed to Step 11.</p>\n<ul>\n<li><a href=\"105\">Particulate</a></li>\n<li><a href=\"106\">Gas or Vapor</a></li>\n<li><a href=\"107\">Combination</a></li>\n</ul>\n", "54": "<p>Is the particulate respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"124\">Yes</a></li>\n<li><a href=\"66\">No</a></li>\n</ul>\n", "55": "<p>Is the gas-vapor respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"125\">Yes</a></li>\n<li><a href=\"67\">No</a></li>\n</ul>\n", "56": "<p>Is the combination respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"126\">Yes</a></li>\n<li><a href=\"68\">No</a></li>\n</ul>\n", "57": "<p>Is the particulate respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"127\">Yes</a></li>\n<li><a href=\"69\">No</a></li>\n</ul>\n", "58": "<p>Is the gas-vapor respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"128\">Yes</a></li>\n<li><a href=\"70\">No</a></li>\n</ul>\n", "59": "<p>Is the combination respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"129\">Yes</a></li>\n<li><a href=\"71\">No</a></li>\n</ul>\n", "60": "<p>Is the particulate respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"130\">Yes</a></li>\n<li><a href=\"72\">No</a></li>\n</ul>\n", "61": "<p>Is the gas-vapor respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"131\">Yes</a></li>\n<li><a href=\"73\">No</a></li>\n</ul>\n", "62": "<p>Is the combination respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"132\">Yes</a></li>\n<li><a href=\"74\">No</a></li>\n</ul>\n", "63": "<p>Is the particulate respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"133\">Yes</a></li>\n<li><a href=\"75\">No</a></li>\n</ul>\n", "64": "<p>Is the gas-vapor respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"134\">Yes</a></li>\n<li><a href=\"76\">No</a></li>\n</ul>\n", "65": "<p>Is the combination respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"135\">Yes</a></li>\n<li><a href=\"77\">No</a></li>\n</ul>\n", "66": "<p>&quot;Stop on Step 9.3C&quot; options chart</p>\n", "67": "<p>&quot;Stop on Step 10.3C&quot; options chart</p>\n", "68": "<p>&quot;Stop on Step 11.2C&quot; options chart</p>\n", "69": "<p>&quot;Stop on Step 9.3D&quot; options chart</p>\n", "70": "<p>&quot;Stop on Step 10.3D&quot; options chart</p>\n", "71": "<p>&quot;Stop on Step 11.2D&quot; options chart</p>\n", "72": "<p>&quot;Stop on Step 9.3A&quot; options chart</p>\n", "73": "<p>&quot;Stop on Step 10.3A&quot; options chart</p>\n", "74": "<p>&quot;Stop on Step 11.23A&quot; options chart</p>\n", "75": "<p>&quot;Stop on Step 9.3B&quot; options chart</p>\n", "76": "<p>&quot;Stop on Step 10.3B&quot; options chart</p>\n", "77": "<p>&quot;Stop on Step 11.2B&quot; options chart</p>\n", "78": "<p>Is the particulate respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"136\">Yes</a></li>\n<li><a href=\"90\">No</a></li>\n</ul>\n", "79": "<p>Is the gas-vapor respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"137\">Yes</a></li>\n<li><a href=\"91\">No</a></li>\n</ul>\n", "80": "<p>Is the combination respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"138\">Yes</a></li>\n<li><a href=\"92\">No</a></li>\n</ul>\n", "81": "<p>Is the particulate respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"139\">Yes</a></li>\n<li><a href=\"93\">No</a></li>\n</ul>\n", "82": "<p>Is the gas-vapor respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"140\">Yes</a></li>\n<li><a href=\"94\">No</a></li>\n</ul>\n", "83": "<p>Is the combination respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"141\">Yes</a></li>\n<li><a href=\"95\">No</a></li>\n</ul>\n", "84": "<p>Is the particulate respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"142\">Yes</a></li>\n<li><a href=\"96\">No</a></li>\n</ul>\n", "85": "<p>Is the gas-vapor respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"143\">Yes</a></li>\n<li><a href=\"97\">No</a></li>\n</ul>\n", "86": "<p>Is the combination respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"144\">Yes</a></li>\n<li><a href=\"98\">No</a></li>\n</ul>\n", "87": "<p>Is the particulate respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"145\">Yes</a></li>\n<li><a href=\"99\">No</a></li>\n</ul>\n", "88": "<p>Is the gas-vapor respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"146\">Yes</a></li>\n<li><a href=\"100\">No</a></li>\n</ul>\n", "89": "<p>Is the combination respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"147\">Yes</a></li>\n<li><a href=\"101\">No</a></li>\n</ul>\n", "90": "<p>&quot;Stop on Step 9.3G&quot; options chart</p>\n", "91": "<p>&quot;Stop on Step 10.3G&quot; options chart</p>\n", "92": "<p>&quot;Stop on Step 11.2G&quot; options chart</p>\n", "93": "<p>&quot;Stop on Step 9.3H&quot; options chart</p>\n", "94": "<p>&quot;Stop on Step 10.3H&quot; options chart</p>\n", "95": "<p>&quot;Stop on Step 11.2H&quot; options chart</p>\n", "96": "<p>&quot;Stop on Step 9.3F&quot; options chart</p>\n", "97": "<p>&quot;Stop on Step 10.3F&quot; options chart</p>\n", "98": "<p>&quot;Stop on Step 11.2F&quot; options chart</p>\n", "99": "<p>&quot;Stop on Step 9.3E&quot; options chart</p>\n", "100": "<p>&quot;Stop on Step 10.3E&quot; options chart</p>\n", "101": "<p>&quot;Stop on Step 11.2E&quot; options chart</p>\n", "102": "<p>Is the particulate respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"149\">No</a></li>\n<li><a href=\"108\">Yes</a></li>\n</ul>\n", "103": "<p>Is the gas-vapor respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"150\">No</a></li>\n<li><a href=\"109\">Yes</a></li>\n</ul>\n", "104": "<p>Is the combination respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"151\">No</a></li>\n<li><a href=\"110\">Yes</a></li>\n</ul>\n", "105": "<p>Is the particulate respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"153\">No</a></li>\n<li><a href=\"111\">Yes</a></li>\n</ul>\n", "106": "<p>Is the gas-vapor respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"154\">No</a></li>\n<li><a href=\"112\">Yes</a></li>\n</ul>\n", "107": "<p>Is the combination respirator intended ONLY for escape purposes?</p>\n<ul>\n<li><a href=\"155\">No</a></li>\n<li><a href=\"113\">Yes</a></li>\n</ul>\n", "108": "<p>&quot;No respirator required for work. Eye protection is recommended for work, because you answered &quot;Yes&quot; to Step 6, indicating the contaminant is an eye irritant. You also MUST SEE Section IV to determine what kind of escape respirator you need.&quot;</p>\n", "109": "<p>&quot;No respirator required for work. Eye protection is recommended for work, because you answered &quot;Yes&quot; to Step 6, indicating the contaminant is an eye irritant. You also MUST SEE Section IV to determine what kind of escape respirator you need.&quot;</p>\n", "110": "<p>&quot;No respirator required for work. Eye protection is recommended for work, because you answered &quot;Yes&quot; to Step 6, indicating the contaminant is an eye irritant. You also MUST SEE Section IV to determine what kind of escape respirator you need.&quot;</p>\n", "111": "<p>&quot;No respirator is required for work. But you MUST SEE Section IV to determine what kind of escape respirator you need.&quot;</p>\n", "112": "<p>&quot;No respirator is required for work. But you MUST SEE Section IV to determine what kind of escape respirator you need.&quot;</p>\n", "113": "<p>&quot;No respirator is required for work. But you MUST SEE Section IV to determine what kind of escape respirator you need.&quot;</p>\n", "114": "<p>&quot;Stop on Step 1&quot; options chart</p>\n", "115": "<p>&quot;Stop on Step 2&quot; options chart</p>\n", "116": "<p>&quot;Stop on Step 3 A&quot; options chart</p>\n", "117": "<p>&quot;Stop on Step 3 B&quot; options chart</p>\n", "118": "<p>&quot;Stop on Step 5A&quot; options chart</p>\n", "119": "<p>&quot;Stop on Step 5B&quot; options chart</p>\n", "120": "<p>&quot;Stop on Step 7B&quot; options chart</p>\n", "121": "<p>&quot;Stop on Step 7D&quot; options chart</p>\n", "122": "<p>Do&quot;Stop on Step 7A&quot; options chart</p>\n", "123": "<p>&quot;Stop on Step 7C&quot; options chart</p>\n", "124": "<p>&quot;Oops. This answer is inconsistent. Double check Step 2 and Step 2-Yes (Oxygen Deficiency/ Contamination).&quot;</p>\n<ul>\n<li><a href=\"54\">Okay</a></li>\n</ul>\n", "125": "<p>&quot;Oops. This answer is inconsistent. Double check Step 2 and Step 2-Yes (Oxygen Deficiency/ Contamination).&quot;</p>\n<ul>\n<li><a href=\"55\">Okay</a></li>\n</ul>\n", "126": "<p>&quot;Oops. This answer is inconsistent. Double check Step 2 and Step 2-Yes (Oxygen Deficiency/ Contamination).&quot;</p>\n<ul>\n<li><a href=\"56\">Okay</a></li>\n</ul>\n", "127": "<p>&quot;Oops. This answer is inconsistent. Double check Step 2 and Step 2-Yes (Oxygen Deficiency/ Contamination).&quot;</p>\n<ul>\n<li><a href=\"57\">Okay</a></li>\n</ul>\n", "128": "<p>&quot;Oops. This answer is inconsistent. Double check Step 2 and Step 2-Yes (Oxygen Deficiency/ Contamination).&quot;</p>\n<ul>\n<li><a href=\"58\">Okay</a></li>\n</ul>\n", "129": "<p>&quot;Oops. This answer is inconsistent. Double check Step 2 and Step 2-Yes (Oxygen Deficiency/ Contamination).&quot;</p>\n<ul>\n<li><a href=\"59\">Okay</a></li>\n</ul>\n", "130": "<p>&quot;Oops. This answer is inconsistent. Double check Step 2 and Step 2-Yes (Oxygen Deficiency/ Contamination).&quot;</p>\n<ul>\n<li><a href=\"60\">Okay</a></li>\n</ul>\n", "131": "<p>&quot;Oops. This answer is inconsistent. Double check Step 2 and Step 2-Yes (Oxygen Deficiency/ Contamination).&quot;</p>\n<ul>\n<li><a href=\"61\">Okay</a></li>\n</ul>\n", "132": "<p>&quot;Oops. This answer is inconsistent. Double check Step 2 and Step 2-Yes (Oxygen Deficiency/ Contamination).&quot;</p>\n<ul>\n<li><a href=\"62\">Okay</a></li>\n</ul>\n", "133": "<p>&quot;Oops. This answer is inconsistent. Double check Step 2 and Step 2-Yes (Oxygen Deficiency/ Contamination).&quot;</p>\n<ul>\n<li><a href=\"63\">Okay</a></li>\n</ul>\n", "134": "<p>&quot;Oops. This answer is inconsistent. Double check Step 2 and Step 2-Yes (Oxygen Deficiency/ Contamination).&quot;</p>\n<ul>\n<li><a href=\"64\">Okay</a></li>\n</ul>\n", "135": "<p>&quot;Oops. This answer is inconsistent. Double check Step 2 and Step 2-Yes (Oxygen Deficiency/ Contamination).&quot;</p>\n<ul>\n<li><a href=\"65\">Okay</a></li>\n</ul>\n", "136": "<p>&quot;Oops. This answer is inconsistent. Double check Step 2 and Step 2-Yes (Oxygen Deficiency/ Contamination).&quot;</p>\n<ul>\n<li><a href=\"78\">Okay</a></li>\n</ul>\n", "137": "<p>&quot;Oops. This answer is inconsistent. Double check Step 2 and Step 2-Yes (Oxygen Deficiency/ Contamination).&quot;</p>\n<ul>\n<li><a href=\"79\">Okay</a></li>\n</ul>\n", "138": "<p>&quot;Oops. This answer is inconsistent. Double check Step 2 and Step 2-Yes (Oxygen Deficiency/ Contamination).&quot;</p>\n<ul>\n<li><a href=\"80\">Okay</a></li>\n</ul>\n", "139": "<p>&quot;Oops. This answer is inconsistent. Double check Step 2 and Step 2-Yes (Oxygen Deficiency/ Contamination).&quot;</p>\n<ul>\n<li><a href=\"81\">Okay</a></li>\n</ul>\n", "140": "<p>&quot;Oops. This answer is inconsistent. Double check Step 2 and Step 2-Yes (Oxygen Deficiency/ Contamination).&quot;</p>\n<ul>\n<li><a href=\"82\">Okay</a></li>\n</ul>\n", "141": "<p>&quot;Oops. This answer is inconsistent. Double check Step 2 and Step 2-Yes (Oxygen Deficiency/ Contamination).&quot;</p>\n<ul>\n<li><a href=\"83\">Okay</a></li>\n</ul>\n", "142": "<p>&quot;Oops. This answer is inconsistent. Double check Step 2 and Step 2-Yes (Oxygen Deficiency/ Contamination).&quot;</p>\n<ul>\n<li><a href=\"84\">Okay</a></li>\n</ul>\n", "143": "<p>&quot;Oops. This answer is inconsistent. Double check Step 2 and Step 2-Yes (Oxygen Deficiency/ Contamination).&quot;</p>\n<ul>\n<li><a href=\"85\">Okay</a></li>\n</ul>\n", "144": "<p>&quot;Oops. This answer is inconsistent. Double check Step 2 and Step 2-Yes (Oxygen Deficiency/ Contamination).&quot;</p>\n<ul>\n<li><a href=\"86\">Okay</a></li>\n</ul>\n", "145": "<p>&quot;Oops. This answer is inconsistent. Double check Step 2 and Step 2-Yes (Oxygen Deficiency/ Contamination).&quot;</p>\n<ul>\n<li><a href=\"87\">Okay</a></li>\n</ul>\n", "146": "<p>&quot;Oops. This answer is inconsistent. Double check Step 2 and Step 2-Yes (Oxygen Deficiency/ Contamination).&quot;</p>\n<ul>\n<li><a href=\"88\">Okay</a></li>\n</ul>\n", "147": "<p>&quot;Oops. This answer is inconsistent. Double check Step 2 and Step 2-Yes (Oxygen Deficiency/ Contamination).&quot;</p>\n<ul>\n<li><a href=\"89\">Okay</a></li>\n</ul>\n", "148": "<p>Double-click this passage to edit it.</p>\n", "149": "<p>&quot;Oops. You answered in a way inconsistent with your response on Step 7B (Potential Hazard). Double check yourself.&quot;</p>\n<ul>\n<li><a href=\"102\">Okay</a></li>\n</ul>\n", "150": "<p>&quot;Oops. You answered in a way inconsistent with your response on Step 7B (Potential Hazard). Double check yourself.&quot;</p>\n<ul>\n<li><a href=\"103\">Okay</a></li>\n</ul>\n", "151": "<p>&quot;Oops. You answered in a way inconsistent with your response on Step 7B (Potential Hazard). Double check yourself.&quot;</p>\n<ul>\n<li><a href=\"104\">Okay</a></li>\n</ul>\n", "152": "<p>Double-click this passage to edit it.</p>\n", "153": "<p>&quot;Oops. You answered in a way inconsistent with your response on Step 7B (Potential Hazard). Double check yourself.&quot;</p>\n<ul>\n<li><a href=\"105\">Okay</a></li>\n</ul>\n", "154": "<p>&quot;Oops. You answered in a way inconsistent with your response on Step 7B (Potential Hazard). Double check yourself.&quot;</p>\n<ul>\n<li><a href=\"106\">Okay</a></li>\n</ul>\n", "155": "<p>&quot;Oops. You answered in a way inconsistent with your response on Step 7B (Potential Hazard). Double check yourself.&quot;</p>\n<ul>\n<li><a href=\"107\">Okay</a></li>\n</ul>\n" };
var decisionData = {
	start: start$1,
	decisions: decisions$1
};

var betterReplace = function replace(regex, replacerFunction, string) {
	return string.replace(forceGlobal(regex), function (match) {
		for (var _len = arguments.length, rest = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
			rest[_key - 1] = arguments[_key];
		}

		var captures = rest.slice(0, -2);
		return replacerFunction.apply(undefined, toConsumableArray(captures));
	});
};

function forceGlobal(regex) {
	var isGlobal = regex.flags.split('').some(function (flag) {
		return flag === 'g';
	});

	return isGlobal ? regex : new RegExp(regex, regex.flags + 'g');
}

var regex = /href="(\d+)"/;

var replaceDecisionLinkUrls = (function (html, makePath) {
	return betterReplace(regex, function (id) {
		return 'href="' + makePath('app.respirator-picker', { id: id }) + '"';
	}, html);
});

var start = decisionData.start;
var decisions = decisionData.decisions;


var client$47$routes$47$app$47$respirator$45$picker$47$respirator$45$picker$46$js = (function (_ref) {
	var makePath = _ref.makePath;
	return {
		name: 'app.respirator-picker',
		route: '/respirator-picker',
		template: RespiratorPicker,
		querystringParameters: ['id'],
		defaultParameters: {
			id: start
		},
		resolve: function resolve(data, params) {
			var html = decisions[params.id];

			if (!html) {
				return Promise.reject({
					redirectTo: {
						name: 'app.not-found',
						params: {
							route: '/respirator-picker',
							parameters: JSON.stringify(params)
						}
					}
				});
			}

			return Promise.resolve({
				html: replaceDecisionLinkUrls(html, makePath)
			});
		}
	};
});

var states = [client$47$routes$47$app$47$app$46$js, client$47$routes$47$home$47$home$46$js, client$47$routes$47$app$47$content$47$content$46$js, client$47$routes$47$app$47$not$45$found$47$not$45$found$46$js, client$47$routes$47$app$47$respirator$45$picker$47$respirator$45$picker$46$js];

var stateRouter = bundle(bundle$1(), document.querySelector('#target'));

var context = {
	makePath: stateRouter.makePath
};

states.forEach(function (createState) {
	return stateRouter.addState(createState(context));
});

stateRouter.on('routeNotFound', function (route, parameters) {
	stateRouter.go('app.not-found', Object.assign({ route: route }, parameters), { replace: true });
});

stateRouter.evaluateCurrentRoute('home');

}());
//# sourceMappingURL=index-bundle.js.map
