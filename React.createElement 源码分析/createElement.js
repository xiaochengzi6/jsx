import getComponentName from "shared/getComponentName";
import invariant from "shared/invariant";
import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols";

import ReactCurrentOwner from "./ReactCurrentOwner";

const hasOwnProperty = Object.prototype.hasOwnProperty;

const RESERVED_PROPS = {
  key: true,
  ref: true,
  __self: true,
  __source: true,
};

let specialPropKeyWarningShown,
  specialPropRefWarningShown,
  didWarnAboutStringRefs;

if (__DEV__) {
  didWarnAboutStringRefs = {};
}
/*工具函数 查看是否存在 ref 属性*/
function hasValidRef(config) {
  if (__DEV__) {
    if (hasOwnProperty.call(config, "ref")) {
      const getter = Object.getOwnPropertyDescriptor(config, "ref").get;
      /*getter 存在并且 isReactWaring 存在 那么就会返回false*/
      if (getter && getter.isReactWarning) {
        return false;
      }
    }
  }
  return config.ref !== undefined;
}

/*工具函数 查看是否存在 key 属性*/
function hasValidKey(config) {
  if (__DEV__) {
    if (hasOwnProperty.call(config, "key")) {
      const getter = Object.getOwnPropertyDescriptor(config, "key").get;
      /*getter 存在并且 isReactWaring 存在 那么就会返回false*/
      if (getter && getter.isReactWarning) {
        return false;
      }
    }
  }
  return config.key !== undefined;
}

/**
 * 会在 createElement 函数中调用 再开发模式下取出 key 的值就会打印一个错误信息 并且你还得不到这个值 hasValidKey 中有这样的判断
 * @param {*} props
 * @param {*} displayName
 */
function defineKeyPropWarningGetter(props, displayName) {
  const warnAboutAccessingKey = function () {
    if (__DEV__) {
      if (!specialPropKeyWarningShown) {
        /*确保只会执行一次 用于标记错误信息是否显示 初始值为 undefiend*/
        specialPropKeyWarningShown = true;
        console.error(
          "%s: `key` is not a prop. Trying to access it will result " +
            "in `undefined` being returned. If you need to access the same " +
            "value within the child component, you should pass it as a different " +
            "prop. (https://reactjs.org/link/special-props)",
          displayName
        );
      }
    }
  };
  /*再 key 上添加一个属性 isReactWarning */
  warnAboutAccessingKey.isReactWarning = true;
  /*获取 key 属性时就会调用这个函数*/
  Object.defineProperty(props, "key", {
    get: warnAboutAccessingKey,
    configurable: true,
  });
}

function defineRefPropWarningGetter(props, displayName) {
  const warnAboutAccessingRef = function () {
    if (__DEV__) {
      if (!specialPropRefWarningShown) {
        specialPropRefWarningShown = true;
        console.error(
          "%s: `ref` is not a prop. Trying to access it will result " +
            "in `undefined` being returned. If you need to access the same " +
            "value within the child component, you should pass it as a different " +
            "prop. (https://reactjs.org/link/special-props)",
          displayName
        );
      }
    }
  };
  warnAboutAccessingRef.isReactWarning = true;
  /*获取 ref 属性时就会调用这个函数*/
  Object.defineProperty(props, "ref", {
    get: warnAboutAccessingRef,
    configurable: true,
  });
}

function warnIfStringRefCannotBeAutoConverted(config) {
  if (__DEV__) {
    if (
      typeof config.ref === "string" &&
      ReactCurrentOwner.current &&
      config.__self &&
      ReactCurrentOwner.current.stateNode !== config.__self
    ) {
      const componentName = getComponentName(ReactCurrentOwner.current.type);

      if (!didWarnAboutStringRefs[componentName]) {
        console.error(
          'Component "%s" contains the string ref "%s". ' +
            "Support for string refs will be removed in a future major release. " +
            "This case cannot be automatically converted to an arrow function. " +
            "We ask you to manually fix this case by using useRef() or createRef() instead. " +
            "Learn more about using refs safely here: " +
            "https://reactjs.org/link/strict-mode-string-ref",
          componentName,
          config.ref
        );
        didWarnAboutStringRefs[componentName] = true;
      }
    }
  }
}

/**
 * Factory method to create a new React element. This no longer adheres to
 * the class pattern, so do not use new to call it. Also, instanceof check
 * will not work. Instead test $$typeof field against Symbol.for('react.element') to check
 * if something is a React Element.
 *
 * @param {*} type
 * @param {*} props
 * @param {*} key
 * @param {string|object} ref
 * @param {*} owner
 * @param {*} self A *temporary* helper to detect places where `this` is
 * different from the `owner` when React.createElement is called, so that we
 * can warn. We want to get rid of owner and replace string `ref`s with arrow
 * functions, and as long as `this` and owner are the same, there will be no
 * change in behavior.
 * @param {*} source An annotation object (added by a transpiler or otherwise)
 * indicating filename, line number, and/or other information.
 * @internal
 */
const ReactElement = function (type, key, ref, self, source, owner, props) {
  const element = {
    // This tag allows us to uniquely identify this as a React Element
    $$typeof: REACT_ELEMENT_TYPE,

    // Built-in properties that belong on the element
    type: type,
    key: key,
    ref: ref,
    props: props,

    // Record the component responsible for creating this element.
    _owner: owner,
  };

  if (__DEV__) {
    // The validation flag is currently mutative. We put it on
    // an external backing store so that we can freeze the whole object.
    // This can be replaced with a WeakMap once they are implemented in
    // commonly used development environments.
    element._store = {};

    // To make comparing ReactElements easier for testing purposes, we make
    // the validation flag non-enumerable (where possible, which should
    // include every environment we run tests in), so the test framework
    // ignores it.
    Object.defineProperty(element._store, "validated", {
      configurable: false,
      enumerable: false,
      writable: true,
      value: false,
    });
    // self和source是仅适用于开发人员的属性。
    Object.defineProperty(element, "_self", {
      configurable: false,
      enumerable: false,
      writable: false,
      value: self,
    });
    // Two elements created in two different places should be considered
    // equal for testing purposes and therefore we hide it from enumeration.
    Object.defineProperty(element, "_source", {
      configurable: false,
      enumerable: false,
      writable: false,
      value: source,
    });

    /* 冻结element.props 对象和 element */
    if (Object.freeze) {
      Object.freeze(element.props);
      Object.freeze(element);
    }
  }

  return element;
};

/**
 * https://github.com/reactjs/rfcs/pull/107
 * @param {*} type
 * @param {object} props
 * @param {string} key
 */
export function jsx(type, config, maybeKey) {
  let propName;

  // Reserved names are extracted
  const props = {};

  let key = null;
  let ref = null;

  // Currently, key can be spread in as a prop. This causes a potential
  // issue if key is also explicitly declared (ie. <div {...props} key="Hi" />
  // or <div key="Hi" {...props} /> ). We want to deprecate key spread,
  // but as an intermediary step, we will use jsxDEV for everything except
  // <div {...props} key="Hi" />, because we aren't currently able to tell if
  // key is explicitly declared to be undefined or not.
  if (maybeKey !== undefined) {
    key = "" + maybeKey;
  }

  if (hasValidKey(config)) {
    key = "" + config.key;
  }

  if (hasValidRef(config)) {
    ref = config.ref;
  }

  // Remaining properties are added to a new props object
  for (propName in config) {
    if (
      hasOwnProperty.call(config, propName) &&
      !RESERVED_PROPS.hasOwnProperty(propName)
    ) {
      props[propName] = config[propName];
    }
  }

  // Resolve default props
  if (type && type.defaultProps) {
    const defaultProps = type.defaultProps;
    for (propName in defaultProps) {
      if (props[propName] === undefined) {
        props[propName] = defaultProps[propName];
      }
    }
  }

  return ReactElement(
    type,
    key,
    ref,
    undefined,
    undefined,
    ReactCurrentOwner.current,
    props
  );
}

/**
 * https://github.com/reactjs/rfcs/pull/107
 * @param {*} type
 * @param {object} props
 * @param {string} key
 */
export function jsxDEV(type, config, maybeKey, source, self) {
  let propName;

  // Reserved names are extracted
  const props = {};

  let key = null;
  let ref = null;

  // Currently, key can be spread in as a prop. This causes a potential
  // issue if key is also explicitly declared (ie. <div {...props} key="Hi" />
  // or <div key="Hi" {...props} /> ). We want to deprecate key spread,
  // but as an intermediary step, we will use jsxDEV for everything except
  // <div {...props} key="Hi" />, because we aren't currently able to tell if
  // key is explicitly declared to be undefined or not.
  if (maybeKey !== undefined) {
    key = "" + maybeKey;
  }

  if (hasValidKey(config)) {
    key = "" + config.key;
  }

  if (hasValidRef(config)) {
    ref = config.ref;
    warnIfStringRefCannotBeAutoConverted(config);
  }

  // Remaining properties are added to a new props object
  for (propName in config) {
    if (
      hasOwnProperty.call(config, propName) &&
      !RESERVED_PROPS.hasOwnProperty(propName)
    ) {
      props[propName] = config[propName];
    }
  }

  // Resolve default props
  if (type && type.defaultProps) {
    const defaultProps = type.defaultProps;
    for (propName in defaultProps) {
      if (props[propName] === undefined) {
        props[propName] = defaultProps[propName];
      }
    }
  }

  if (key || ref) {
    const displayName =
      typeof type === "function"
        ? type.displayName || type.name || "Unknown"
        : type;
    if (key) {
      defineKeyPropWarningGetter(props, displayName);
    }
    if (ref) {
      defineRefPropWarningGetter(props, displayName);
    }
  }

  return ReactElement(
    type,
    key,
    ref,
    self,
    source,
    ReactCurrentOwner.current,
    props
  );
}

/**
 * Create and return a new ReactElement of the given type.
 * See https://reactjs.org/docs/react-api.html#createelement
 */
export function createElement(type, config, children) {
  let propName;

  // Reserved names are extracted
  const props = {};

  let key = null;
  let ref = null;
  let self = null;
  let source = null;

  //将config上合法的ref与key保存到内部变量ref和key
  if (config != null) {
    if (hasValidRef(config)) {
      ref = config.ref;

      if (__DEV__) {
        warnIfStringRefCannotBeAutoConverted(config);
      }
    }
    if (hasValidKey(config)) {
      key = "" + config.key;
    }

    self = config.__self === undefined ? null : config.__self;
    source = config.__source === undefined ? null : config.__source;
    // Remaining properties are added to a new props object
    /*将config 的 __self __source ref key 赋值到 props 对象上*/
    for (propName in config) {
      if (
        hasOwnProperty.call(config, propName) &&
        !RESERVED_PROPS.hasOwnProperty(propName)
      ) {
        props[propName] = config[propName];
      }
    }
  }

  // Children can be more than one argument, and those are transferred onto
  // the newly allocated props object.
  //  如果只有三个参数，将第三个参数直接覆盖到props.children上
  //  如果不止三个参数，将后面的参数组成一个数组，覆盖到props.children上
  const childrenLength = arguments.length - 2;
  if (childrenLength === 1) {
    props.children = children;
  } else if (childrenLength > 1) {
    const childArray = Array(childrenLength);
    for (let i = 0; i < childrenLength; i++) {
      childArray[i] = arguments[i + 2];
    }
    if (__DEV__) {
      if (Object.freeze) {
        // 不允许改变 数组
        Object.freeze(childArray);
      }
    }
    props.children = childArray;
  }

  // Resolve default props
  //  如果有默认的props值，那么将props上为undefined的属性设置初始值
  if (type && type.defaultProps) {
    const defaultProps = type.defaultProps;
    for (propName in defaultProps) {
      if (props[propName] === undefined) {
        props[propName] = defaultProps[propName];
      }
    }
  }
  if (__DEV__) {
    /*如果 key 或者 ref 有值*/
    if (key || ref) {
      //type如果是个函数说明不是原生的dom标签，可能是一个组件，那么可以取
      const displayName =
        typeof type === "function"
          ? type.displayName || type.name || "Unknown"
          : type;
      // defineKeyPropWarningGetter与defineRefPropWarningGetter标记新组件上的props也就是这里的props上的ref与key在获取其值得时候是不合法的。
      if (key) {
        defineKeyPropWarningGetter(props, displayName);
      }
      if (ref) {
        defineRefPropWarningGetter(props, displayName);
      }
    }
  }

  // 生产环境下的ref和key还是被赋值到组件上
  return ReactElement(
    type,
    key,
    ref,
    self,
    source,
    ReactCurrentOwner.current,
    props
  );
}

/**
 * Return a function that produces ReactElements of a given type.
 * See https://reactjs.org/docs/react-api.html#createfactory
 */
// 返回用于生成指定类型 React 元素的函数。
export function createFactory(type) {
  const factory = createElement.bind(null, type);
  // Expose the type on the factory and the prototype so that it can be
  // easily accessed on elements. E.g. `<Foo />.type === Foo`.
  // This should not be named `constructor` since this may not be the function
  // that created the element, and it may not even be a constructor.
  // Legacy hook: remove it
  factory.type = type;
  return factory;
}

// 克隆旧的元素但用新元素的 key 去替换旧 key
export function cloneAndReplaceKey(oldElement, newKey) {
  const newElement = ReactElement(
    oldElement.type,
    newKey,
    oldElement.ref,
    oldElement._self,
    oldElement._source,
    oldElement._owner,
    oldElement.props
  );

  return newElement;
}

/**
 * Clone and return a new ReactElement using element as the starting point.
 * See https://reactjs.org/docs/react-api.html#cloneelement
 */
// element 是原先的节点 使用 createElement 创建出的, config 保存有新的 props , children 子节点
// 目的：克隆 element 节点 并让 config 去更新 克隆后的props
//  如果config 没有key 或者 ref 就要使用 element中的 ref 或者 key 而且 ref 是一个字符串并不会获得节点
//  并且再config 存在的情况下 会更新 props
export function cloneElement(element, config, children) {
  invariant(
    !(element === null || element === undefined),
    "React.cloneElement(...): The argument must be a React element, but you passed %s.",
    element
  );

  let propName;

  // Original props are copied
  // 浅层合并
  const props = Object.assign({}, element.props);

  // Reserved names are extracted
  //  保留原先 element 的 key 和 ref
  let key = element.key;
  let ref = element.ref;
  // Self is preserved since the owner is preserved.
  const self = element._self;
  // Source is preserved since cloneElement is unlikely to be targeted by a
  // transpiler, and the original source is probably a better indicator of the
  // true owner.
  const source = element._source;

  // Owner will be preserved, unless ref is overridden
  let owner = element._owner;

  // 如果 config 有 且 ref 或者 key 存在就要去替换 element 中的 key 或者 ref
  if (config != null) {
    if (hasValidRef(config)) {
      // Silently steal the ref from the parent.
      ref = config.ref;
      owner = ReactCurrentOwner.current;
    }
    if (hasValidKey(config)) {
      key = "" + config.key;
    }

    // Remaining properties override existing props
    // 默认值存在的情况就要再 props 对象中的属性为空的情况下使用
    let defaultProps;
    if (element.type && element.type.defaultProps) {
      defaultProps = element.type.defaultProps;
    }
    for (propName in config) {
      if (
        hasOwnProperty.call(config, propName) &&
        !RESERVED_PROPS.hasOwnProperty(propName)
      ) {
        if (config[propName] === undefined && defaultProps !== undefined) {
          // Resolve default props
          // 有就使用默认值
          props[propName] = defaultProps[propName];
        } else {
          // 没有就要用 新的props (config) 去替换 props 对象中存的 element.props 值
          props[propName] = config[propName];
        }
      }
    }
  }

  // Children can be more than one argument, and those are transferred onto
  // the newly allocated props object.
  // 传入的参数  == 3 的时候就让 children 直接覆盖 props.children 
  // 传入的参数 > 3 的情况下会将参数保存为一个数组 
  const childrenLength = arguments.length - 2;
  if (childrenLength === 1) {
    props.children = children;
  } else if (childrenLength > 1) {
    const childArray = Array(childrenLength);
    for (let i = 0; i < childrenLength; i++) {
      childArray[i] = arguments[i + 2];
    }
    props.children = childArray;
  }

  // 然后在调用 这个函数 处理里面的值
  return ReactElement(element.type, key, ref, self, source, owner, props);
}

/**
 * Verifies the object is a ReactElement.
 * See https://reactjs.org/docs/react-api.html#isvalidelement
 * @param {?object} object
 * @return {boolean} True if `object` is a ReactElement.
 * @final
 */
//  判断一个对象是否是合法的react元素，即判断其$$typeof属性是否为REACT_ELEMENT_TYPE
export function isValidElement(object) {
  return (
    typeof object === "object" &&
    object !== null &&
    object.$$typeof === REACT_ELEMENT_TYPE
  );
}
