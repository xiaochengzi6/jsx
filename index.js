/**
 * 将demo的例子做成了插件的形式 plugin-jsx.js 插件的本体 target_code.js是目标文件
 */

const { transformFileSync } = require('@babel/core');
const createJSX = require('./plugin-jsx');
const path = require('path');

const { code } = transformFileSync(path.join(__dirname, './target_code.js'), {
    plugins: [createJSX],
    parserOpts: {
        plugins: ['jsx']       
    }
});

console.log(code);