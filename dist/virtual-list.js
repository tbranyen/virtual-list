(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.VirtualList = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict';

/**
 * Represents a Virtual Scrollable Region.
 *
 * @class
 * @return
 */

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var VirtualList = function () {
  function VirtualList(config) {
    _classCallCheck(this, VirtualList);

    var width = config && config.w && config.w + 'px' || '100%';
    var height = config && config.h && config.h + 'px' || '100%';
    var itemHeight = this.itemHeight = config.itemHeight;

    this.generatorFn = config.generatorFn;
    this.totalRows = config.totalRows;

    this.container = VirtualList.createContainer(config.container, width, height);

    var scroller = VirtualList.createScroller(itemHeight * this.totalRows);
    this.container.appendChild(scroller);

    var screenItemsLen = Math.ceil(config.h / itemHeight);

    // Cache 4 times the number of items that fit in the container viewport.
    this.cachedItemsLen = screenItemsLen * 3;
    this._renderChunk(0);

    var lastRepaintY;
    var maxBuffer = screenItemsLen * itemHeight;
    var lastScrolled = 0;

    // As soon as scrolling has stopped, this interval asynchronously removes
    // all the nodes that are not used anymore.
    this.rmNodeInterval = setInterval(function () {
      if (Date.now() - lastScrolled > 100) {
        var badNodes = document.querySelectorAll('[data-rm="1"]');

        Array.prototype.forEach.call(badNodes, function (badNode) {
          badNode.parentNode.removeChild(badNode);
        });
      }
    }, 300);

    var render = function () {
      // Triggers reflow
      var context = { scrollTop: 0 };

      if (config.beforeRender) {
        config.beforeRender(context);

        if (context.height) {
          var _screenItemsLen = Math.ceil(context.height / itemHeight);
          this.cachedItemsLen = _screenItemsLen * 3;
        }
      }

      var scrollTop = context.scrollTop;

      if (scrollTop !== lastRepaintY) {
        if (!lastRepaintY || Math.abs(scrollTop - lastRepaintY) > maxBuffer) {
          var first = parseInt(scrollTop / itemHeight) - screenItemsLen;
          this._renderChunk(first < 0 ? 0 : first);
          if (config.afterRender) {
            config.afterRender();
          }
          lastRepaintY = scrollTop;
        }

        lastScrolled = Date.now();
      }

      this._rAF = requestAnimationFrame(render);
    }.bind(this);

    render();
  }

  _createClass(VirtualList, [{
    key: 'destroy',
    value: function destroy() {
      clearInterval(this.rmNodeInterval);
      cancelAnimationFrame(this._rAF);
    }
  }, {
    key: 'createRow',
    value: function createRow(i) {
      var item = this.generatorFn(i);

      item.classList.add('vrow');
      item.style.top = i * this.itemHeight + 'px';
      item.style.position = 'absolute';

      return item;
    }

    /**
     * Renders a particular, consecutive chunk of the total rows in the list. To
     * keep acceleration while scrolling, we mark the nodes that are candidate
     * for deletion instead of deleting them right away, which would suddenly
     * stop the acceleration. We delete them once scrolling has finished.
     *
     * @param {Node} node Parent node where we want to append the children chunk.
     * @param {Number} from Starting position, i.e. first children index.
     * @return {void}
     */

  }, {
    key: '_renderChunk',
    value: function _renderChunk(from) {
      var finalItem = from + this.cachedItemsLen;

      if (finalItem > this.totalRows) {
        finalItem = this.totalRows;
      }

      // Append all the new rows in a document fragment that we will later append
      // to the parent node
      var fragment = document.createDocumentFragment();

      for (var i = from; i < finalItem; i++) {
        fragment.appendChild(this.createRow(i));
      }

      var cacheTracer = this.container.firstChild;
      this.container.innerHTML = '';
      this.container.appendChild(cacheTracer);

      // Hide and mark obsolete nodes for deletion.
      for (var j = 1, l = this.container.childNodes.length; j < l; j++) {
        this.container.childNodes[j].style.display = 'none';
        this.container.childNodes[j].setAttribute('data-rm', '1');
      }

      this.container.appendChild(fragment);
    }

    /**
     *
     *
     * @return
     */

  }], [{
    key: 'createContainer',
    value: function createContainer(container, width, height) {
      container = container || document.createElement('div');

      container.setAttribute('style', '\n      width: ' + width + ';\n      height: ' + height + ';\n      overflow: auto;\n      position: relative;\n      padding: 0;\n    ');

      return container;
    }

    /**
     * Creates a new Scroller Element,
     *
     * @return {Node} element
     */

  }, {
    key: 'createScroller',
    value: function createScroller(height) {
      var scroller = document.createElement('tr');

      scroller.setAttribute('style', '\n      opacity: 0;\n      position: absolute;\n      top: 0;\n      left: 0;\n      width: 1px;\n      height: ' + height + 'px;\n    ');

      return scroller;
    }
  }]);

  return VirtualList;
}();

exports.default = VirtualList;

},{}]},{},[1])(1)
});