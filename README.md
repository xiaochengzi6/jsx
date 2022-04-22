## 阅读须知

意在理解其大致流程并没有涉及深入的源码了解和实现

React 团队为了能够方便的将 js 与视图结合起来就扩充了 js 语法使之有了 jsx 然后又将其于 react 拆分出来，jsx 不仅 react 可用,其他的框架也可用,在 js 中编写虚拟 dom 成为了可能。

这篇文章主要是来理解 jsx 它是如果转换成 js
## jsx 的转换

这是一段 jsx 语法 将其转换成 js 语法 通过 babel 转换后可以看到

```js
import React, { Component } from "react";

class CommentInput extends Component {
  render() {
    return <div>CommentInput</div>;
  }
}
```

```js
// 转换后
import React, { Component } from "react";

class CommentInput extends Component {
  render() {
    return /*#__PURE__*/ React.createElement("div", null, "CommentInput");
  }
}
```

可以看到是 `<div>...</div>` 这段代码转换成 `/*#__PURE__*/React.createElement("div", null, "CommentInput");`
使用了 `React.createElement()` 函数


有这样功能是通过 Babel 来实现了

在命令行键入 ` node_modules/.bin/babel index.js -o demo.js`

```js
// babel.config.js
module.exports = {
  presets: [],
  plugins: ["@babel/plugin-transform-react-jsx"],
};

// index.js
/** @jsx a */
let foo = (
  <div id="foo">
    <span>hello </span>
    <span> world</span>
  </div>
);

// demo.js
/** @jsx a */
let foo = a(
  "div",
  {
    id: "foo",
  },
  a("span", null, "hello "),
  a("span", null, " world")
);
```

可以看到生成了一个关于 a 的函数也不难想象 babel 在 jsx 语法中也是做了这种默认的操作。当去除文件顶部的`/** @jsx a */` 就会默认使用 `React.createElement()`函数

## babel 

babel 是一个转译器 它的主要作用就是代码的转换

它分为三个阶段
1、在 parse 阶段会将代码转换成抽象语法树 AST

2、在 transfrom 阶段去遍历抽象语法树并且调用 `visitor` 函数对抽象语法树 AST 进行修改

3、generator 阶段将语法树生成代码字符串返回 sourceMap

那我们可以知道 在使用 babel 对代码进行转义的时候就对其抽象语法树做出了修改我们来看一下

```js
let foo = (
  <div id="foo">
    <span>hello </span>
    <span> world</span>
  </div>
);
```

### ast 树
babel 将 代码 转换成的语法树这里很长精简一下。。。

```json
{
  "type": "Program",
  "body": [
    {
      "type": "VariableDeclaration",
      "declarations": [
        {
          "type": "VariableDeclarator",
          "id": {
            "type": "Identifier",
            "name": "foo"
          },
          "init": {
            "type": "JSXElement",
            "openingElement": {},
            "closingElement": {}
            },
            "children": [],
            }
          }
        ],
      "kind": "let"
    }
  ],
  "sourceType": "module"
}
```

可以看到 babel 在遇到 `<div>` 这类代码时候就会产生一个 `JSXElement` 的节点里面存储着 `<div>` 信息

>在 `node_module/@babel/plugin-transform-react-jsx` 文件夹下的 `create-plugins.js` 中大约 600 行代码....此时在谈分析不如说咱们将神经粗大选择性眼瞎来去简单的看一下源码


## jsx 语法
主要分析 babel 插件的结构

首先先要明确几个名词

1、`JSXAttribute` 里面存储着 jsx 语法中的属性 比如`<h1 onChange={/*...*/}}></h1>` 这里 `onChange={/*...*/}}` 这些就是会在抽象语法树上标记为 `JSXAttribute`

2、`JSXFragment` jsx 语法片段 它长长这样 `<> </>` 它具有 JSXElement 相似的行为 这样的用法是处于不会将其内容包裹到一个块中而是作为一个片段返回 比如经常在 react 就能见到它。它和 DOM 文档片段类似。关于更多内容[JSXFragment](https://github.com/facebook/jsx/pull/93)

```js
function Element() {
  return (
    <>
      <span>1</span>
      <span>2</span>
      <span>3</span>
    </>
  );
}
```

3、`JSXElement` 最常见的表示 jsx 元素的标识符 比如 `<h1></h1>` 那这个 `<h1>` 就会在 AST 树上标记为 `JSXElement`

4、`JSXNamespacedName` 表示 jsx 的命名空间 在使用到这种形式 `\<foo:bar></foo:bar>`的时候会被找到

它的语法：

```
JSXNamespacedName :
- JSXIdentifier `:` JSXIdentifier

<foo:bar></foo:bar>
```

[关于 JSXNamespacedName 的讨论](https://github.com/facebook/jsx/issues/42#issuecomment-307585322)

5、`JSXSpreadChild` 看他们的讨论是准备增加这样的标识符号的但我并没有在实验出来 [JSXSpreadChild](https://github.com/babel/babylon/pull/42)

更多的 jsx 的使用语法查看[手册](https://facebook.github.io/jsx/#prod-JSXNamespacedName)

## babel 插件的了解

babel 插件的统一格式是这样的

```js
export default function(api, options, dirname) {
  return {
    inherits: /*...*/,
    visitor: {},
    manipulateOptions (){/*...*/}
  };
}
```

参数 `api` babel 中的 api 比如 @babel/themplate @babel/types 这些包就会在 api 中获取

参数 `options` 函数外部传入的参数

参数 `dirname` 目录名

返回的对象有 inherits, visitor, manipulateOptions 返回的对象有很多用于不同的场合这里就简单的罗列几个。

`inherits`: 用于继承某插件与当前的插件合并

`visitor`: 用于在 traverse 阶段调用的函数函数 用于修改 AST 抽象语法树的节点

`manipulateOptions:` 用于修改 options

现在来看一下源码 这里省略了很多行代码为了就是能够看下去，我本身水平不高和大家一起浅析一下就行了解这里面的大致步骤。如果出现错误请大家及时提出，万分感谢。

整个 `plugin` 的格式是使用了一个函数

```js
var _helperPluginUtils = require("@babel/helper-plugin-utils");
exports.default = createPlugin;
function createPlugin() {
  return (0, _helperPluginUtils.declare)((api, options) => {
    return {
      /*...*/
    };
  });
}
```

实际上就是执行了这一句话`_helperPluginUtils.declare((api, options) => {/*...*/})`
我们再来看一下 ` _helperPluginUtils` 整个函数做了什么

```js
exports.declare = declare;
function declare(builder) {
  return (api, options, dirname) => {
    /*....*/
    return builder(api, option, dirname);
  };
}
```

大致上是做了一个包装内部判断(babel 的版本)和值的提取(babel 的 api)忽略的来看也是返回了一个 `babel Plugin` 通用的插件函数

我们重点看一下 `(api, options) => {/*...*/}` 这段函数 他才是最主要的

```js
// .....
var _pluginSyntaxJsx = require("@babel/plugin-syntax-jsx");

// .....
(api, options) => {
  /*...*/
  return {
    name,
    inherits: _pluginSyntaxJsx.default,
    visitor: {
      JSXNamespacedName(path) {/*...*/},

      JSXSpreadChild(path) {/*...*/},

      Program: {
        enter(path, state) {/*...*/},

        JSXElement: {exit(path, file) {/*...*/},}

        JSXFragment: {exit(path,file) {/*...*/},},

        JSXAttribute: {/*...*/},
        },
      },
    },
  };
};
```

现在也就能清晰的看出来它的改动方向了 先继承了 `@babel/plugin-syntax-jsx` 然后又去通过 transform 阶段遍历 AST 树时候调用 visitor 中相应的函数

当 visitor 的值是函数的时候就相当于是 enter() 调用的(在进入 ast 节点时调用) 是对象时候就可以明确指出是 enter() 还是 exit() [exit() (在离开 ast 节点时调用)]

首先是 `JSXNamespacedName` 和 `JSXSpreadChild` 当出现这两个标识符的时候就会调用这两个函数

AST 树 最外层节点 是 file 它有 type program start end loc error comments 这五个节点 源码就存放在 `program` 树上

在遍历开始的时候(program) 会做一些初始化的操作 `enter()` 然后在离开 `JSXElement` 和 `JSXFragment` 会修改 ast 树 还有一个 `JSXAttribute` 会在进入的时候就使用。

我们主要看一下 `JSXElement` 上的代码 另外`JSXAttribute` 和 `JSXFragment` 都有异曲同工之处

```js
{
  /*.....*/
  JSXElement: {
  exit(path, file){
    // ....
    let callExpr = buildJSXElementCall(path, file);
    function buildCreateElementCall(path, file) {
      return call(file, "createElement", ...args);
      }
    function call(pass, name, args) {
      const node = _core.types.callExpression(/* createElement(...) 这种函数表达式*/)(), args);
      return node;
     }
    path.replaceWith(_core.types.inherits(callExpr, path.node))
  }
}
```

主要是这里面做了一些判断和修改 将内部的属性和 child 做了一个遍历 然后将这些值传入到 `call()` 函数中他接收 `pass` 是节点名 `name` 是属性名 `args`节点的字节点。

## jsx 转换的案例

我做了一个很粗糙的 demo 大家可以来尝试一下

>这里实现的很粗糙并没有对其他的 jsx 节点做出更改不过原理大致是一样的 


```js
// 1、将代码转为 ast 树
const ast = parser.parse(target, {/*...*/});

// 遍历 ast 树
traverse(ast, {
  JSXElement(path, state) {
     {/*...*/}
    /*创建expression 表达式*/
    const newNode = template.expression(/*h()类似于这样形式的表达式*/)();
    /*替换*/
    path.replaceWith(newNode);
  },
});

// 3、将 ast 树转换成 conde 代码
const { code } = generate(ast);
console.log(code);
/*
let foo = h(div, null, h(span, null, ''), h(span, null, ''));
PS：不是完整代码 完整代码看文末 github 仓库下的 demo.js 文件
*/
```

> 关于@babel/plugin-transform-react-jsx 精简后的代码我放到了文末

这里的案例就是在遍历 ast 树时找到 `JSXElement` 节点然后去将其替换成用 js 对象表达的形式将其被函数包裹在返回

到目前为止 如何将 jsx 语法转换成 js 的过程我们有了大致的了解 我们来看一下 转换后的代码

```js
/** @jsx a */
let foo = a(
  "div",
  {
    id: "foo",
  },
  a("span", null, "hello "),
  a("span", null, " world")
);

// 或者长张这个样子
let foo = /*#__PURE__*/ React.createElement(
  "div",
  {
    id: "foo",
  },
  /*#__PURE__*/ React.createElement("span", null, "hello "),
  /*#__PURE__*/ React.createElement("span", null, " world")
);
```

这两种代码形式原理都是一样的都是使用了一个用函数包裹的方式

~~~js
let foo = a(
  "div",
  {
    id: "foo",
  },
  a("span", null, "hello "),
  a("span", null, " world")
);
~~~

这里我们是使用了 `/*@jsx a*/` 这样的标识来让 babel 来用 `a` 函数包裹 它默认会使用 `React.createElement()` 函数 函数名虽然不同 但是函数里面的内容都是类似的

~~~js
class Element {
    constructor(type, props, children) {
        this.type = type;
        this.props = props;
        this.children = children;
    }
}
function a (type, props, children) {
    return new Element(type, props, children);
}
~~~

我们用 js 对象来表示 dom 树 通过这样的转换后我们就能间接的操作 dom  

```js
{
  type: 'div',
  props: {id: 'foo'},
  children: [
    {
      type: 'span',
      props: null,
      children: ["hello"]
    },
    {
      type: 'span',
      props: null,
      children: ["hello"]
    }
  ]
}
```
关于虚拟 dom 的了解可以看一下 我这篇[文章](https://github.com/xiaochengzi6/learnVirtuaDOM) 

如今的 react 并不会采用这样的方式 `React.createElement`去解析 jsx  在 React 17 中它使用了一种全新的解析方式 以至于你可以不用再 react 项目中引入 `import React from 'react'` babel它会自动的引入 `react/jsx-runtime` 这个包去使用。关于这部分的介绍可以看一下[官网](https://zh-hans.reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html) 

~~~js
// 转换前
function App() {
  return <h1>Hello World</h1>;
}

// 转换后
"use strict";

var _jsxRuntime = require("react/jsx-runtime");

function App() {
  return /*#__PURE__*/(0, _jsxRuntime.jsx)("h1", {
    children: "Hello World"
  });
}
~~~

不过我想大致都是相同 `React.createElement` 还是值得学习的
## React.createElement 源码

~~~js
export function createElement (type, config, child) {
  // ...
  let {key, ref, source, owner, props} = config
  // owner 先不关注
  return ReactElement (type, key, ref, self, source, owner, props)
}

export function ReactElement (type, key, ref, self, source, owner, props) {
  const element = {
    $$type,
    props,
    key,
    self
    _owner: owner
  }

  if(__DEV){
    const store = {}
    element.store.validated = false;
    element.__self = self;
    element.__source = source
  }

  // 冻结
  Object.freeze(element)
  Object.freeze(element.props)

  return element
}
~~~

大致的就是用 js 对象描述了一个 dom 树对象 详细的还需要再看一下[源码](https://github.com/xiaochengzi6/jsx-)

关于例子[在这里](https://github.com/xiaochengzi6/jsx-)

这是 @babel/plugin-transform-react-jsx 精简后的代码
> "@babel/plugin-transform-react-jsx": "^7.17.3"
```js
var _helperPluginUtils = require("@babel/helper-plugin-utils");
var _pluginSyntaxJsx = require("@babel/plugin-syntax-jsx");
var _core = require("@babel/core");
/*...*/
exports.default = createPlugin;

const DEFAULT = {
  importSource: "react",
  runtime: "automatic",
  pragma: "React.createElement",
  pragmaFrag: "React.Fragment",
};

/*...*/

const get = (pass, name) => pass.get(`@babel/plugin-react-jsx/${name}`);

function createPlugin({ name, development }) {
  return (0, _helperPluginUtils.declare)((api, options) => {
    /*...*/
    return {
      name,
      inherits: _pluginSyntaxJsx.default,
      visitor: {
        JSXNamespacedName(path) {
          /*...*/
        },

        JSXSpreadChild(path) {
          /*...*/
        },

        Program: {
          enter(path, state) {
            /*...*/
          },

          JSXElement: {
            exit(path, file) {
              // ....
              let callExpr;
              callExpr = buildJSXElementCall(path, file);
              function buildCreateElementCall(path, file) {
                const openingPath = path.get("openingElement");
                return call(file, "createElement", [
                  getTag(openingPath),
                  buildCreateElementOpeningElementAttributes(
                    file,
                    path,
                    openingPath.get("attributes")
                  ),
                  ..._core.types.react.buildChildren(path.node),
                ]);
              }
              function call(pass, name, args) {
                const node = _core.types.callExpression(
                  get(pass, `id/${name}`)(),
                  args
                );
                return node;
              }

              path.replaceWith(_core.types.inherits(callExpr, path.node));
            },
          },

          JSXFragment: {
            exit() {
              /*...*/
            },
          },

          JSXAttribute: {
            /*...*/
          },
        },
      },
    };
  });
}
```

## 参考

1. [Babel 插件手册](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/zh-Hans/plugin-handbook.md#toc-replacing-a-node)
2. [ast 树](https://astexplorer.net/)
3. [使用 Babel plugin 实现 React 双向绑定糖 参考了他的主要流程](https://zhuanlan.zhihu.com/p/29622485)
4. [深度剖析：如何实现一个 Virtual DOM 算法 #13 作者：戴嘉华](https://github.com/livoras/blog/issues/13)
