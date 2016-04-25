'use strict';

/**
 * Represents a Virtual Scrollable Region.
 *
 * @class
 * @return
 */
export default class VirtualList {
  constructor(config) {
    var width = (config && config.w && config.w + 'px') || '100%';
    var height = (config && config.h && config.h + 'px') || '100%';
    var itemHeight = this.itemHeight = config.itemHeight;

    this.items = config.items;
    this.generatorFn = config.generatorFn;
    this.totalRows = config.totalRows || (config.items && config.items.length);

    this.container = VirtualList.createContainer(
      config.container, width, height
    );

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
    this.rmNodeInterval = setInterval(() => {
      if (Date.now() - lastScrolled > 100) {
        let badNodes = document.querySelectorAll('[data-rm="1"]');

        Array.prototype.forEach.call(badNodes, badNode => {
          badNode.parentNode.removeChild(badNode);
        });
      }
    }, 300);

    const render = function() {
      // Triggers reflow
      var context = document.querySelector('nf-sticky-table').context || {};
      var scrollTop = context.scrollTop || 0;

      if (scrollTop !== lastRepaintY) {
        if (!lastRepaintY || Math.abs(scrollTop - lastRepaintY) > maxBuffer) {
          var first = parseInt(scrollTop / itemHeight) - screenItemsLen;
          this._renderChunk(first < 0 ? 0 : first);
          lastRepaintY = scrollTop;
        }

        lastScrolled = Date.now();
      }

      this._rAF = requestAnimationFrame(render);
    }.bind(this);

    render();
  }

  createRow(i) {
    var item;

    if (this.generatorFn) {
      item = this.generatorFn(i);
    }
    else if (this.items) {
      if (typeof this.items[i] === 'string') {
        var itemText = document.createTextNode(this.items[i]);
        item = document.createElement('div');
        item.style.height = this.itemHeight + 'px';
        item.appendChild(itemText);
      } else {
        item = this.items[i];
      }
    }

    item.classList.add('vrow');
    item.style.top = `${i * this.itemHeight}px`;
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
  _renderChunk(from) {
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
  static createContainer(container, width, height) {
    container = container || document.createElement('div');

    container.setAttribute('style', `
      width: ${width};
      height: ${height};
      overflow: auto;
      position: relative;
      padding: 0;
    `);

    return container;
  }

  /**
   * Creates a new Scroller Element,
   *
   * @return {Node} element
   */
  static createScroller(height) {
    const scroller = document.createElement('tr');

    scroller.setAttribute('style', `
      opacity: 0;
      position: absolute;
      top: 0;
      left: 0;
      width: 1px;
      height: ${height}px;
    `);

    return scroller;
  }
}