require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"min-document":1}],3:[function(require,module,exports){
//
// Observable JS
//

'use strict';

// Publishers and Subscribers share the Observable
// interface, which includes a get() and subscribe()
// function.
function Observable() {
}

Observable.prototype.subscribe = function(f) {
    if (!this.subscribers) {
        this.subscribers = [f];
    } else {
        this.subscribers.push(f);
    }
    return this;
};

function Publisher(v) {
    this.value = v;
}

// Observable values
Publisher.prototype = new Observable();
Publisher.prototype.constructor = Publisher;

Publisher.prototype.set = function(v) {
    this.value = v;
    if (this.subscribers) {
        var me = this;
        this.subscribers.forEach(function(f) {
            f(me);
        });
    }
    return this;
};

Publisher.prototype.get = function() {
    return this.value;
};

// Observable computations.  subscriber() takes a list of observables
// and a callback function and returns an observable.  Any time
// a value is requested AND an input has changed, the given callback
// is executed, and its return value is returned.
function Subscriber(args, f) {
    this.valid = false;
    this.f = f;
    this.oArgs = null;
    this.args = [];

    var me = this;  // Avoid 'this' ambiguity.

    // Handle an observable list of subscribers.
    if (args instanceof Observable) {
        this.oArgs = args;
        args = this.oArgs.get();
        this.oArgs.subscribe(function() {
            // TODO: unsubscribe previous values.
            me.args = [];
            me.oArgs.get().forEach(function(o) {
                me.addArg(o);
            });
            me.invalidate();
        });
    }

    args.forEach(function(o) {
        me.addArg(o);
    });
}

Subscriber.prototype = new Observable();
Subscriber.prototype.constructor = Subscriber;

Subscriber.prototype.addArg = function(o) {
    this.args.push(o);
    var me = this;
    if (o instanceof Observable) {
        o.subscribe(function() {
            me.invalidate();
        });
    }
};

Subscriber.prototype.invalidate = function() {
    if (this.valid) {
        this.valid = false;
        if (this.subscribers) {
            for (var i = 0; i < this.subscribers.length; i++) {
                var f = this.subscribers[i];
                f(this);
            }
        }
    }
};

Subscriber.prototype.get = function() {
    if (this.valid) {
        return this.value;
    } else {
        var vals = this.args.map(function(o) {
            return o instanceof Observable ? o.get() : o;
        });

        var oldValue = this.value;
        this.value = this.f.apply(null, vals);
        this.valid = true;

        if (this.value !== oldValue && this.subscribers) {
            var me = this;
            this.subscribers.forEach(function(f) {
                f(me);
            });
        }

        return this.value;
    }
};

function subscriber(args, f) {
    return new Subscriber(args, f);
}

// o.map(f) is a shorthand for observable.subscriber([o], f)
Observable.prototype.map = function(f) {
    return subscriber([this], f);
};

// Handy function to lift a raw function into the observable realm
function lift(f) {
    return function() {
        var args = Array.prototype.slice.call(arguments);
        return subscriber(args, f);
    };
}

// Handy function to capture the current state of an object containing observables
function snapshot(o) {
    if (typeof o === 'object') {
        if (o instanceof Observable) {
            return snapshot(o.get());
        } else {
            if (o instanceof Array) {
                return o.map(snapshot);
            } else {
                var o2 = {};
                var k;
                for (k in o) {
                    o2[k] = snapshot(o[k]);
                }
                return o2;
            }
        }
    } else {
        return o;
    }
}

function publisher(v) {
    return new Publisher(v);
}

module.exports = {
    Observable: Observable,
    Publisher: Publisher,
    publisher: publisher,
    Subscriber: Subscriber,
    subscriber: subscriber,
    lift: lift,
    snapshot: snapshot
};

},{}],"/index.js":[function(require,module,exports){
'use strict';

var model = require('./model');
var view = require('./view');

var oTodoData = model.createObservableTodoData();

module.exports = view.container([
  view.todoSection([
    view.todoHeader([
      view.h1('todos'),
      view.newTodoItem('What needs to be done?', oTodoData)
    ]),
    view.mainSection([
      view.toggleCheckbox('Mark all as complete'),
      view.todoList(oTodoData)
    ]),
    view.todoFooter([
      view.todoItemsLeft(oTodoData),
      view.todoFilters([
        view.link('#/', 'All'),
        view.link('#/active', 'Active'),
        view.link('#/completed', 'Completed')
      ]),
      view.clearButton('Clear completed')
    ])
  ]),
  view.infoFooter([
    view.paragraph(['Double-click to edit a todo']),
    view.paragraph([
      'Created by ',
      view.link('https://github.com/garious', 'Greg Fitzgerald')
    ]),
    view.paragraph([
      'May one day be a part of ',
      view.link('http://todomvc.com', 'TodoMVC')
    ])
  ])
]);

},{"./model":"/model.js","./view":"/view.js"}],"/model.js":[function(require,module,exports){
'use strict';

var observable = require('poochie/observable');

function observeTodoItemData(data) {
  return {
    text: observable.publisher(data.text),
    completed: observable.publisher(Boolean(data.completed))
  };
}

var rawTodoData = [
  {text: 'Taste JavaScript', completed: true},
  {text: 'Buy a unicorn'}
];

function createObservableTodoData() {
  return observable.publisher(rawTodoData.map(observeTodoItemData));
}

function addItem(text, oTodoData) {
  var data = oTodoData.get();
  data.push(observeTodoItemData({text: text}));
  oTodoData.set(data);
}

function removeItem(idx, oTodoData) {
  var data = oTodoData.get();
  data.splice(idx, 1);
  oTodoData.set(data);
}

module.exports = {
  addItem: addItem,
  createObservableTodoData: createObservableTodoData,
  removeItem: removeItem
};

},{"poochie/observable":3}],"/view.js":[function(require,module,exports){
'use strict';

var dom = require('poochie/dom');
var observable = require('poochie/observable');
var model = require('./model');

var ENTER_KEY = 13;

function container(contents, name, className) {
  var params = {name: name || 'div', contents: contents};
  if (className) {
    params.attributes = {'class': className};
  }
  return dom.element(params);
}

function link(href, text) {
  var oClass = observable.publisher(undefined);
  return dom.element({
    name: 'a',
    attributes: {'class': oClass, href: href},
    contents: [text],
    handlers: {
      select: function() { oClass.set('selected'); },
      blur: function() { oClass.set(undefined); }
    }
  });
}

function toggleCheckbox(text) {
  var toggleAllLabel = dom.element({
    name: 'label',
    attributes: {'for': 'toggle-all'},
    contents: [text]
  });

  return dom.element({
    name: 'div',
    contents: [
      dom.element({
        name: 'input',
        attributes: {'class': 'toggle-all', type: 'checkbox'}
      }),
      toggleAllLabel
    ]
  });
}

function isObservableFalse(o) {
  return !o.get();
}

function todoItemsLeftContents(items) {
  var itemsLeft = items.filter(isObservableFalse).length;
  return [
     dom.element({name: 'strong', contents: [String(itemsLeft)]}),
     ' item' + (itemsLeft === 1 ? '' : 's') + ' left'
  ];
}

function completedField(item) {
  return item.completed;
}

function completedFields(data) {
  return data.map(completedField);
}

function oTodoItemsLeftContents(oItems) {
  // An observable of observables.
  var oCompletedFields = oItems.map(completedFields);

  // Notified if any of item changes state, or if the total number of items
  // changes.
  var oCompletedTodoData = observable.subscriber(oCompletedFields, function() {
    return oCompletedFields.get();
  });
  return oCompletedTodoData.map(todoItemsLeftContents);
}

function todoItemsLeft(oTodoData) {
  return container(oTodoItemsLeftContents(oTodoData), 'span', 'todo-count');
}

function newTodoItem(placeholderText, oTodoData) {
  function onKeyUp(evt) {
    var value = evt.target.value.trim();
    if (evt.keyCode === ENTER_KEY && value) {
      model.addItem(value, oTodoData);
      evt.target.value = '';
    }
  }
  return dom.element({
    name: 'input',
    attributes: {
      'class': 'new-todo',
      placeholder: placeholderText,
      autofocus: true
    },
    handlers: {
      keyup: onKeyUp
    }
  });
}

function checkedAttr(val) {
  return val ? true : undefined;
}

function displayStyle(val) {
  return val ? 'block' : 'none';
}

function readModeTodoItem(attrs) {
  return dom.element({
    name: 'div',
    attributes: {'class': 'view'},
    style: {'display': attrs.readMode.map(displayStyle)},
    handlers: {
      'dblclick': function onDblClick() { attrs.readMode.set(false); }
    },
    contents: [
      dom.element({
        name: 'label',
        contents: attrs.text.map(function(x) { return [x]; })
      }),
      dom.element({
        name: 'button',
        attributes: {'class': 'destroy'},
        handlers: {
          'click': function() { model.removeItem(attrs.index, attrs.oTodoData); }
        }
      })
    ]
  });
}

function not(val) {
  return !val;
}

function writeModeTodoItem(attrs) {
  return dom.element({
    name: 'input',
    attributes: {'class': 'edit', value: attrs.text},
    style: {'display': attrs.readMode.map(not).map(displayStyle)},
    handlers: {
      'change': function onChange(evt) {
        var value = evt.target.value.trim();
        if (value === '') {
          model.removeItem(attrs.index, attrs.oTodoData);
        } else {
          attrs.text.set(value);
        }
        attrs.readMode.set(true);
      }
    }
  });
}

function completedClass(val) {
  return val ? 'completed' : '';
}

function todoItem(oTodoData, attrs, index) {
  var itemAttrs = {
    index: index,
    oTodoData: oTodoData,
    text: attrs.text,
    completed: attrs.completed,
    readMode: observable.publisher(true)
  };

  return dom.element({
    name: 'li',
    attributes: {'class': itemAttrs.completed.map(completedClass)},
    contents: [
      dom.element({
        name: 'input',
        attributes: {
          'class': 'toggle',
          type: 'checkbox',
          checked: itemAttrs.completed.map(checkedAttr)
        },
        handlers: {
          'click': function() { itemAttrs.completed.set(!itemAttrs.completed.get()); }
        }
      }),
      readModeTodoItem(itemAttrs),
      writeModeTodoItem(itemAttrs)
    ]
  });
}

function todoList(oTodoData) {
  function todoItems(todoData) {
    return todoData.map(todoItem.bind(null, oTodoData));
  }
  var oItems = oTodoData.map(todoItems);
  return container(oItems, 'ul', 'todo-list');
}

function listItem(xs) {
  return container(xs, 'li');
}

module.exports = {
  clearButton: function(s) { return container([s], 'button', 'clear-completed'); },
  container: container,
  h1: function(s) { return container([s], 'h1'); },
  infoFooter: function(xs) { return container(xs, 'footer', 'info'); },
  link: link,
  listItem: listItem,
  mainSection: function(xs) { return container(xs, 'section', 'main'); },
  newTodoItem: newTodoItem,
  paragraph: function(xs) { return container(xs, 'p'); },
  todoFilters: function(xs) { return container(xs.map(listItem), 'ul', 'filters'); },
  todoFooter: function(xs) { return container(xs, 'footer', 'footer'); },
  todoHeader: function(xs) { return container(xs, 'header', 'header'); },
  todoItem: todoItem,
  todoItemsLeft: todoItemsLeft,
  todoItemsLeftContents: todoItemsLeftContents,
  todoList: todoList,
  todoSection: function(xs) { return container(xs, 'section', 'todoapp'); },
  toggleCheckbox: toggleCheckbox,
  readModeTodoItem: readModeTodoItem,
  writeModeTodoItem: writeModeTodoItem
};

},{"./model":"/model.js","poochie/dom":"poochie/dom","poochie/observable":3}],"poochie/dom":[function(require,module,exports){
//
// Module name:
//
//     dom
//
// Description:
//
//     'dom' is a JavaScript module for creating HTML elements.
//     The module exposes two object constructors, 'createElement' and 'element'.
//     The functions accept the same arguments, an HTML tag name, an attributes
//     object, an array of subelements, and an eventHandlers object.  The
//     difference is that 'element' postpones the creation of an underlying DOM
//     element, whereas 'createElement' creates and returns the DOM element.
//
//     createElement(x) === element(x).render()
//
//     By postponing the creation of the DOM, we can unit test modules
//     that return element objects without requiring a browser or a browser
//     simulator such as JsDom or Zombie.  A bare-bones JavaScript interpreter
//     such as Node.js will suffice.
//

'use strict';

var document = require('global/document');
var observable = require('./observable');
var intervalTimers = [];

// Add style 's' with value 'style[s]' to the DOM element 'e'.
function addStyle(e, subscriber, style, s) {
    if (style[s] instanceof observable.Observable) {
        e.style[s] = style[s].get();
        var o = style[s].map(function(v) { e.style[s] = v; });
        subscriber.addArg(o);
    } else {
        e.style[s] = style[s];
    }
}

// Add attribute 'k' with value 'v' to the DOM element 'e'.   If the
// attribute's value is 'undefined', it will be ignored.  If the
// attribute's value is an observable, then any time its value is
// 'undefined', the attribute will be removed.
function addAttribute(e, subscriber, k, v) {
    if (v instanceof observable.Observable) {
        var val = v.get();
        if (val !== undefined) {
            e.setAttribute(k, val);
        }
        var o = v.map(function(v2) {
            if (v2 !== undefined) {
                e.setAttribute(k, v2);
            } else {
                e.removeAttribute(k);
            }
        });
        subscriber.addArg(o);
    } else {
        e.setAttribute(k, v);
    }
}

function setChildren(subscriber, e, xs) {
    e.innerHTML = '';
    for (var i = 0; i < xs.length; i++) {
        var x = xs[i];
        x = typeof x === 'string' ? document.createTextNode(x) : x;
        if (typeof x.render === 'function') {
            x = x.render();
        }
        e.appendChild(x);
    }
}

// Create a DOM element with tag name 'nm', attributes object 'as', style object 'sty',
// an array of subelements 'xs', and an object of event handlers 'es'.
function createElementAndSubscriber(ps) {

    // Create DOM node
    var e = document.createElement(ps.name);

    // Create a subscriber to watch any observables.
    var subscriber = observable.subscriber([], function() { return e; });

    // Add attributes
    var as = ps.attributes;
    var k;
    if (as) {
        for (k in as) {
            if (k !== 'style' && as[k] !== undefined) {
                addAttribute(e, subscriber, k, as[k]);
            }
        }
    }

    // Add Style
    var style = ps.style;
    if (style) {
        for (var s in style) {
            if (style[s] !== undefined) {
                addStyle(e, subscriber, style, s);
            }
        }
    }

    // Add child elements
    var xs = ps.contents;
    if (xs) {
        if (typeof xs === 'string') {
            e.appendChild(document.createTextNode(xs));
        } else {
            if (xs instanceof observable.Observable) {
                var xsObs = xs;
                xs = xsObs.get();
                var o = xsObs.map(function(ys) {
                    setChildren(subscriber, e, ys);
                });
                subscriber.addArg(o);
            }
            setChildren(subscriber, e, xs);
        }
    }

    // Add event handlers
    var es = ps.handlers;
    if (typeof es === 'object') {
        for (k in es) {
            e.addEventListener(k, es[k]);
        }
    }
    return {
        element: e,
        subscriber: subscriber
    };
}

function createElement(ps) {
    if (typeof ps === 'string') {
        ps = {name: ps};
    }

    var obj = createElementAndSubscriber(ps);

    if (obj.subscriber.args.length > 0) {
        var id = setInterval(function() { obj.subscriber.get(); }, 30);
        intervalTimers.push(id);
    }

    return obj.element;
}

//
// clear all interval timers created by createElement()
//
function clearIntervalTimers() {
    for (var i = 0; i < intervalTimers.length; i++) {
        clearInterval(intervalTimers[i]);
    }
}

//
// element({name, attributes, style, contents, handlers})
//
function ReactiveElement(as) {

    if (typeof as === 'string') {
        as = {name: as};
    }

    this.name = as.name;

    if (as.attributes !== undefined) {
        this.attributes = as.attributes;
    }

    if (as.style !== undefined) {
        this.style = as.style;
    }

    if (as.contents !== undefined) {
        this.contents = as.contents;
    }

    if (as.handlers !== undefined) {
        this.handlers = as.handlers;
    }
}

ReactiveElement.prototype.render = function() {
    return createElement(this);
};

function element(as) {
    return new ReactiveElement(as);
}

// Render a string or object with a render method, such as a ReactiveElement.
function render(e) {
    if (typeof e === 'string') {
        return document.createTextNode(e);
    }
    return e.render();
}

module.exports = {
    createElement: createElement,
    createElementAndSubscriber: createElementAndSubscriber,
    clearIntervalTimers: clearIntervalTimers,
    ReactiveElement: ReactiveElement,
    element: element,
    render: render
};

},{"./observable":3,"global/document":2}]},{},[]);
