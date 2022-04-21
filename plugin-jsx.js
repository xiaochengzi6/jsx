// const types = require("@babel/types");
// const template = require('@babel/template')
let a = [];

module.exports = function createJSX(api, options, dirname) {
  let {template,types} = api
  return {
    visitor: {
      JSXElement(path, state) {
        if (path.node.isNew == 0) {
          return;
        }
        if (path.node.openingElement) {
          let value = path.node.openingElement.name.name;
          path.node.isNew = 0;
          a.push({ value, children: [] });
        }

        if (path.node.children) {
          let arrs = path.node.children;
          arrs.forEach((element, i) => {
            if (types.isJSXElement(element)) {
              let value = element.openingElement.name.name;
              for (let f in a) {
                let child = a[f].children;
                child = child ? child : [];
                child.push(value);
              }
              element.isNew = 0;
            }
          });
        }
        let strExpression;
        a.forEach((element) => {
          let child = element && element.children;
          let childExpression = "";
          for (let k = 0; k < child.length; k++) {
            childExpression += "," + ` h(${child[k]}, ${null}, '')`;
          }
          let value = element && element.value;
          strExpression = `h(${value}, ${null} ${childExpression})`;
        });
        const newNode = template.expression(strExpression)();
        path.replaceWith(newNode);
      },
    },
  };
}
