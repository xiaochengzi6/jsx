const format = 'React.cloneElement(...): The argument must be a React element, but you passed %s.'

let args = [1,2,3,344]
let argIndex = 0;

console.log(format.replace(/%s/g, function() {
  return args[argIndex++];
}))
