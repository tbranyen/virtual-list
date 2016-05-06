## Virtual List

This is a simple component that can be dropped into any JavaScript application
and provide a virtual scrolling area that is highly performant and lightweight.
With zero dependencies and well under 200 lines of code sans comments, it is
easy to parse and use.

## Installation

```sh
npm install virtual-list
```

Of course it can also just be added to any JavaScript project since it consists
of a single JavaScript file.

## Usage

Below is an example of typical usage:

``` javascript
// Create a container element or find one that already exists in the DOM.
const container = document.createElement('div');

// Pass the container element and configuration to the VirtualList constructor.
// You can optionally use the create method if you prefer to avoid `new`.
const list = VirtualList.create(container, {
  // Default to 100% width. And specify the container to be 300px tall, sets
  // this as an inline style.
  height: 300,

  // All items must be the exact same height currently. Although since there is
  // a generate method, in the future this should be configurable.
  itemHeight: 30,

  // Specify the total amount of items to render the virtual height.
  total: 10000,

  // Wire up the data to the index. The index is then mapped to a Y position
  // in the container.
  generate(index) {
    const el = document.createElement('div');

    el.innerHTML = `ITEM ${index}`;
    el.style.borderBottom = '1px solid red';
    el.style.position = 'absolute'

    return el;
  },
});

// Attach the container to the DOM.
document.body.appendChild(container);
```

An example with all the options, mounted to the entire page that refreshes when
the browser resizes:

``` javascript
const config = {
  width: '100%',
  height: window.innerHeight,

  // All items must be the exact same height currently. Although since there is
  // a generate method, in the future this should be configurable.
  itemHeight: 30,

  // Specify the total amount of items to render the virtual height.
  total: 10000,

  // Reverse the list to start from the bottom instead of the top.
  reverse: true,

  // By default Virtual List will determine scroll offset from the container
  // element. You can override this lookup by using this hook.
  overrideScrollPosition() {
    return document.body.scrollTop;
  },

  // Wire up the data to the index. The index is then mapped to a Y position
  // in the container.
  generate(index) {
    const el = document.createElement('div');

    el.innerHTML = `ITEM ${index}`;
    el.style.borderBottom = '1px solid red';
    el.style.position = 'absolute'

    return el;
  },

  // Triggerd after any items have been added into the DOM.
  afterRender() {
    console.log('Rendered some items');
  },
};

// Pass the container element and configuration to the VirtualList constructor.
// You can optionally use the create method if you prefer to avoid `new`.
const list = VirtualList.create(container, config);

window.onresize = () => {
  config.height = window.innerHeight;
  list.refresh(container, config);
};
```

## Demo

![Demo](/example.gif?raw=true)
