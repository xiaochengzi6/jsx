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
const ast = parser.parse(target, {
  sourceType: "unambiguous",
  plugins: ["jsx"],
});

let a = [];
traverse(ast, {
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
    a.forEach((element)=>{
      let child = element && element.children 
      let childExpression = '';
      for(let k=0; k<child.length; k++){
        childExpression += ','+ ` h(${child[k]}, ${null}, '')`
      }
      let value = element && element.value 
      strExpression = `h(${value}, ${null} ${childExpression})`
    })
    const newNode = template.expression(strExpression)();
    path.replaceWith(newNode)
  },
});

const { code } = generate(ast);
console.log(code);

// const { code } = transformFileSync(target, {
//   plugins: [createJSX],
//   parserOpts: {
//     sourceType: 'unambiguous',
//     plugins: ['jsx']
// }
// })

// function createJSX(api, options) {
//   return {
//     visitor: {},
//   };
// }
