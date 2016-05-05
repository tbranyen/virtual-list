(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.VirtualList = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict';

// Default configuration.

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var defaultConfig = {
  width: '100%',
  height: '100%'
};

// Private class properties.
var _config = Symbol('config');
var _element = Symbol('element');
var _scroller = Symbol('scroller');
var _renderAnimationFrame = Symbol('renderAnimationFrame');
var _renderChunk = Symbol('renderChunk');
var _screenItemsLen = Symbol('screenItemsLen');
var _cachedItemsLen = Symbol('cachedItemsLen');
var _lastRepaint = Symbol('lastRepaint');
var _getRow = Symbol('getRow');
var _getScrollPosition = Symbol('getScrollPosition');

var VirtualList = function () {
  _createClass(VirtualList, null, [{
    key: 'create',
    value: function create(element, userProvidedConfig) {
      return new VirtualList(element, userProvidedConfig);
    }
  }]);

  function VirtualList(element) {
    var _this = this;

    var userProvidedConfig = arguments.length <= 1 || arguments[1] === undefined ? defaultConfig : arguments[1];

    _classCallCheck(this, VirtualList);

    this[_config] = {};
    this[_lastRepaint] = 0;

    this.refresh(element, userProvidedConfig);

    var config = this[_config];
    var context = { scrollTop: 0 };

    var render = function render() {
      var scrollTop = _this[_getScrollPosition]();
      var screenItemsLen = _this[_screenItemsLen];
      var maxBuffer = screenItemsLen * config.itemHeight;
      var lastRepaint = _this[_lastRepaint];

      _this[_renderAnimationFrame] = requestAnimationFrame(render);

      if (scrollTop === lastRepaint) {
        return;
      } else if (!lastRepaint || Math.abs(scrollTop - lastRepaint) > maxBuffer) {
        _this[_renderChunk]();
        _this[_lastRepaint] = scrollTop;
        if (config.afterRender) {
          config.afterRender();
        }
      }
    };

    render();
  }

  _createClass(VirtualList, [{
    key: 'destroy',
    value: function destroy() {
      cancelAnimationFrame(this[_renderAnimationFrame]);
    }
  }, {
    key: 'refresh',
    value: function refresh(element, userProvidedConfig) {
      Object.assign(this[_config], userProvidedConfig, defaultConfig);

      if (!element || element.nodeType !== 1) {
        throw new Error('Virtual List requires a valid DOM Node container');
      }

      this[_element] = element;

      var scroller = this[_scroller] || document.createElement('tr');
      var config = this[_config];

      if (!config.generate) {
        throw new Error('Missing required `generate` function');
      }

      if (Number(config.total) !== Number(config.total)) {
        throw new Error('Invalid required `total` value, expected number');
      }

      // Width and height should be coerced to string representations. Either in
      // `%` or `px`.
      Object.keys(defaultConfig).filter(function (prop) {
        return prop in config;
      }).forEach(function (prop) {
        var value = config[prop];

        if (typeof value !== 'string' && typeof value !== 'number') {
          var msg = 'Invalid optional `' + prop + '`, expected string or number';
          throw new Error(msg);
        } else if (typeof value === 'number' || value.slice(-1) !== '%') {
          config[prop] = value + 'px';
        }
      });

      // Decorate the container element with inline styles that will match
      // the user supplied configuration.
      element.setAttribute('style', '\n      width: ' + config.width + ';\n      height: ' + config.height + ';\n      overflow: auto;\n      position: relative;\n      padding: 0;\n    ');

      scroller.setAttribute('style', '\n      opacity: 0;\n      position: absolute;\n      top: 0;\n      left: 0;\n      width: 1px;\n      height: ' + config.itemHeight * config.total + 'px;\n    ');

      // Only append the scroller element once.
      if (!this[_scroller]) {
        element.appendChild(scroller);
      }

      // FIXME This should be able to resolve strings.
      var trueElementHeight = userProvidedConfig.height;

      this[_screenItemsLen] = Math.ceil(trueElementHeight / config.itemHeight);
      // Cache 4 times the number of items that fit in the container viewport.
      this[_cachedItemsLen] = this[_screenItemsLen] * 3;

      // Set the scroller instance.
      this[_scroller] = scroller;

      // Render after refreshing.
      this[_renderChunk]();
    }
  }, {
    key: _getRow,
    value: function value(i) {
      var config = this[_config];
      var item = config.generate(i);

      if (!item || item.nodeType !== 1) {
        throw new Error('Generator did not return a DOM Node for index: ' + i);
      }

      item.classList.add('vrow');
      item.style.top = i * config.itemHeight + 'px';
      item.style.position = 'absolute';

      return item;
    }
  }, {
    key: _getScrollPosition,
    value: function value() {
      var config = this[_config];

      if (typeof config.overrideScrollPosition === 'function') {
        return config.overrideScrollPosition();
      }

      return this[_element].scrollTop;
    }

    /**
     * Renders a particular, consecutive chunk of the total rows in the list. To
     * keep acceleration while scrolling, we mark the nodes that are candidate
     * for deletion instead of deleting them right away, which would suddenly
     * stop the acceleration. We delete them once scrolling has finished.
     *
     * @param {Node} node Parent node where we want to append the children chunk.
     * @return {void}
     */

  }, {
    key: _renderChunk,
    value: function value() {
      var config = this[_config];
      var element = this[_element];
      var total = config.total;
      var scrollTop = this[_getScrollPosition]();
      var screenItemsLen = this[_screenItemsLen];
      var itemHeight = config.itemHeight;
      var estimatedFrom = Math.floor(scrollTop / itemHeight) - screenItemsLen;
      var from = estimatedFrom < 0 ? 0 : estimatedFrom;
      var estimatedTo = from + this[_cachedItemsLen];
      var to = estimatedTo > total ? total : estimatedTo;

      // Append all the new rows in a document fragment that we will later append
      // to the parent node
      var fragment = document.createDocumentFragment();

      // Keep the scroller in the list of children.
      fragment.appendChild(this[_scroller]);

      for (var i = from; i < to; i++) {
        fragment.appendChild(this[_getRow](i));
      }

      element.innerHTML = '';
      element.appendChild(fragment);
    }
  }]);

  return VirtualList;
}();

exports.default = VirtualList;

},{}]},{},[1])(1)
});