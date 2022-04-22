const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const types = require("@babel/types");
const template = require('@babel/template')


const target = `
let foo = (
  <div id="foo">
    <span>hello </span>
    <span> world</span>
  </div>
);
`;
// 1、将代码转为 ast 树
const ast = parser.parse(target, {
  sourceType: "unambiguous",
  plugins: ["jsx"],
});

let a = [];

// 遍历 ast 树
traverse(ast, {
  JSXElement(path, state) {
    /*被标记的节点就会弹出*/
    if (path.node.isNew == 0) {
      return;
    }
    /*寻找 openingElement 节点下的值 并保存在数组中*/
    if (path.node.openingElement) {
      let value = path.node.openingElement.name.name;
      path.node.isNew = 0;
      a.push({ value, children: [] });
    }
    /*查找子节点*/
    if (path.node.children) {
      let arrs = path.node.children;
      /*遍历子节点*/
      arrs.forEach((element, i) => {
        /*保存子节点*/
        if (types.isJSXElement(element)) {
          let value = element.openingElement.name.name;
          for (let f in a) {
            let child = a[f].children;
            child = child ? child : [];
            child.push(value);
          }
          /*标记*/
          element.isNew = 0;
        }
      });
    }
    let strExpression;
    /*遍历 jsxElement*/
    a.forEach((element) => {
      let child = element && element.children;
      let childExpression = "";
      /*遍历子节点*/
      for (let k = 0; k < child.length; k++) {
        childExpression += "," + ` h(${child[k]}, ${null}, '')`;
      }
      let value = element && element.value;
      strExpression = `h(${value}, ${null} ${childExpression})`;
    });
    /*创建expression 表达式*/
    const newNode = template.expression(strExpression)();
    /*替换*/
    path.replaceWith(newNode);
  },
});

// 3、将 ast 树转换成 conde 代码
const { code } = generate(ast);
console.log(code);