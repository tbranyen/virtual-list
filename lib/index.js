'use strict';

// Default configuration.
const defaultConfig = {
  width: '100%',
  height: '100%',
};

// Private class properties.
const _config = Symbol('config');
const _element = Symbol('element');
const _scroller = Symbol('scroller');
const _renderAnimationFrame = Symbol('renderAnimationFrame');
const _renderChunk = Symbol('renderChunk');
const _screenItemsLen = Symbol('screenItemsLen');
const _cachedItemsLen = Symbol('cachedItemsLen');
const _lastRepaint = Symbol('lastRepaint');
const _getRow = Symbol('getRow');
const _getScrollPosition = Symbol('getScrollPosition');

export default class VirtualList {
  static create(element, userProvidedConfig) {
    return new VirtualList(element, userProvidedConfig);
  }

  constructor(element, userProvidedConfig=defaultConfig) {
    this[_config] = {};
    this[_lastRepaint] = 0;

    this.refresh(element, userProvidedConfig);

    const config = this[_config];
    const context = { scrollTop: 0 };


    const render = () => {
      const scrollTop = this[_getScrollPosition]();
      const screenItemsLen = this[_screenItemsLen];
      const maxBuffer = screenItemsLen * config.itemHeight;
      const lastRepaint = this[_lastRepaint];

      this[_renderAnimationFrame] = requestAnimationFrame(render);

      if (scrollTop === lastRepaint) {
        return;
      }
      else if (!lastRepaint || Math.abs(scrollTop - lastRepaint) > maxBuffer) {
        this[_renderChunk]();
        this[_lastRepaint] = scrollTop;
        if (config.afterRender) { config.afterRender(); }
      }
    };

    render();
  }

  destroy() {
    cancelAnimationFrame(this[_renderAnimationFrame]);
  }

  refresh(element, userProvidedConfig) {
    Object.assign(this[_config], userProvidedConfig, defaultConfig);

    if (!element || element.nodeType !== 1) {
      throw new Error('Virtual List requires a valid DOM Node container');
    }

    this[_element] = element;

    const scroller = this[_scroller] || document.createElement('tr');
    const config = this[_config];

    if (!config.generate) {
      throw new Error('Missing required `generate` function');
    }

    if (Number(config.total) !== Number(config.total)) {
      throw new Error('Invalid required `total` value, expected number');
    }

    // Width and height should be coerced to string representations. Either in
    // `%` or `px`.
    Object.keys(defaultConfig).filter(prop => prop in config).forEach(prop => {
      const value = config[prop];

      if (typeof value !== 'string' && typeof value !== 'number') {
        let msg = `Invalid optional \`${prop}\`, expected string or number`;
        throw new Error(msg);
      }

      else if (typeof value === 'number' || value.slice(-1) !== '%') {
        config[prop] = `${value}px`;
      }
    });

    // Decorate the container element with inline styles that will match
    // the user supplied configuration.
    element.setAttribute('style', `
      width: ${config.width};
      height: ${config.height};
      overflow: auto;
      position: relative;
      padding: 0;
    `);

    scroller.setAttribute('style', `
      opacity: 0;
      position: absolute;
      top: 0;
      left: 0;
      width: 1px;
      height: ${config.itemHeight * config.total}px;
    `);

    // Only append the scroller element once.
    if (!this[_scroller]) {
      element.appendChild(scroller);
    }

    // FIXME This should be able to resolve strings.
    const trueElementHeight = userProvidedConfig.height;

    this[_screenItemsLen] = Math.ceil(trueElementHeight / config.itemHeight);
    // Cache 4 times the number of items that fit in the container viewport.
    this[_cachedItemsLen] = this[_screenItemsLen] * 3;

    // Set the scroller instance.
    this[_scroller] = scroller;

    // Render after refreshing.
    this[_renderChunk]();
  }

  [_getRow](i) {
    const config = this[_config];
    const item = config.generate(i);

    if (!item || item.nodeType !== 1) {
      throw new Error(`Generator did not return a DOM Node for index: ${i}`);
    }

    item.classList.add('vrow');
    item.style.top = `${i * config.itemHeight}px`;
    item.style.position = 'absolute';

    return item;
  }

  [_getScrollPosition]() {
    const config = this[_config];

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
  [_renderChunk]() {
    const config = this[_config];
    const element = this[_element];
    const total = config.total;
    const scrollTop = this[_getScrollPosition]();
    const screenItemsLen = this[_screenItemsLen];
    const itemHeight = config.itemHeight;
    const estimatedFrom = Math.floor(scrollTop / itemHeight) - screenItemsLen;
    const from = estimatedFrom < 0 ? 0 : estimatedFrom;
    const estimatedTo = from + this[_cachedItemsLen];
    const to = estimatedTo > total ? total : estimatedTo;

    // Append all the new rows in a document fragment that we will later append
    // to the parent node
    const fragment = document.createDocumentFragment();

    // Keep the scroller in the list of children.
    fragment.appendChild(this[_scroller]);

    for (let i = from; i < to; i++) {
      fragment.appendChild(this[_getRow](i));
    }

    element.innerHTML = '';
    element.appendChild(fragment);
  }
}
