const fs = require('fs');
const _argv = require('minimist')(process.argv.slice(2))

export function has(target, k) {
  return target.hasOwnProperty(k) && target[k] !== "undefined";
}


export function fexists(path) {
  return fs.existsSync(`${path}`)
}

export function fread(path, encode) {
  return fs.readFileSync(path, encode)
}

export function fsize(fpath) {
  return fs.statSync(fpath).size;
}


/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 * https://stackoverflow.com/questions/27936772/how-to-deep-merge-instead-of-shallow-merge
 */
export function mergeDeep(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  function isObject(x) {
    return typeof x === "object";
  }

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) {
          Object.assign(target, { [key]: {} });
        }

        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}

export function loopDecimalPart(
  decimal_size,
  multiply,
  intpart,
  min,
  max,
  clback,
  start_at
) {
  for (
    var decimal = Math.abs(typeof start_at === "number" ? start_at : (decimal_size - multiply)).toFixed(0);
    decimal >= 0;
    decimal -= multiply
  ) {
    const item = (intpart >= 0 ? 1 : - 1) * (Math.abs(intpart) + (decimal / decimal_size));
    if ((item < min) || (item > max)) {
      return;
    }

    clback(
      item,
      decimal
    );
  }
}

/**
 *
 * @param {*} fpath
 */
export function writedata(fpath, ctt) {
  const dir = path.dirname(fpath);
  !fs.existsSync(dir) && fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${fpath}`, ctt, 'ascii');
}

export function delfile(path) {
  fs.unlinkSync(path);
}


/**
 *
 * @param {*} abrev
 * @param {*} fullname
 * @param {*} defval
 * @returns
 */
export function getCMDParam(abrev, fullname, defval) {
  const __get = (x) => {
    if (_argv.hasOwnProperty(x)) {
      return _argv[x];
    }

    if (_argv._.indexOf(x) >= 0) {
      return true;
    }

    return (typeof defval !== 'undefined') ? defval : false;
  }

  abrev = abrev.trim();
  fullname = (typeof fullname === 'string') ? fullname.trim() : "";

  let x = __get(abrev);

  return x !== false ? x : (
    (fullname.length > 0)
      ? __get(fullname)
      : false
  );
}