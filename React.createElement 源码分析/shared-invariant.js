/**
 * 用于某个错误条件下的错误提醒
 * 
 * @param {Boolean} condition 布尔值 用于是否抛出错误
 * @param {*} format 错误的提示信息 condition == true 时就会抛出这个错误
 * a b c d e f 都是用于替换错误的提示信息中 %s 占位符的
 * @param {*} a 
 * @param {*} b 
 * @param {*} c 
 * @param {*} d 
 * @param {*} e 
 * @param {*} f 
 */

export default function invariant(condition, format, a, b, c, d, e, f) {
  validateFormat(format);
  
  if (!condition) {
    let error;
    if (format === undefined) {
      error = new Error(
        'Minified exception occurred; use the non-minified dev environment ' +
          'for the full error message and additional helpful warnings.',
      );
    } else {
      const args = [a, b, c, d, e, f];
      let argIndex = 0;
      error = new Error(
        format.replace(/%s/g, function() {
          return args[argIndex++];
        }),
      );
      error.name = 'Invariant Violation';
    }

    error.framesToPop = 1; // we don't care about invariant's own frame
    throw error;
  }
}

let validateFormat = () => {};

if (__DEV__) { 
  
  validateFormat = function(format) {
    if (format === undefined) {
      throw new Error('invariant requires an error message argument');
    }
  };
}
