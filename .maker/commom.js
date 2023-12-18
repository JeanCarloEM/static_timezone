import fs from 'fs';
import minimist from 'minimist';
import { find } from 'geo-tz';
import PATH from "path"
import { TZs } from "./TZs.js"

const _argv = minimist(process.argv.slice(2))

export function maxlength(...args) {
  let len = 0;
  args.reduce(
    (a, c) => {
      len = len > `${c}`.length ? len : `${c}`.length
    }
  );

  return len;
}

export function minlength(...args) {
  let len = `${args[0]}`.length;
  args.reduce(
    (a, c) => {
      len = len < `${c}`.length ? len : `${c}`.length
    }
  );

  return len;
}

export function has(target, k) {
  return (typeof target === "object") && target.hasOwnProperty(k) && target[k] !== "undefined";
}


export function fexists(fpath) {
  return fs.existsSync(`${fpath}`)
}

export function fread(fpath, encode) {
  return fs.readFileSync(fpath, encode)
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
  const dir = PATH.dirname(fpath);
  !fs.existsSync(dir) && fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${fpath}`, ctt, 'ascii');
}

export function delfile(fpath) {
  (fexists(fpath)) && fs.unlinkSync(fpath);
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
    if (has(_argv, x)) {
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

export function isOcean(latitude, longitude, fail) {
  return false;
}

export function getTZ(latitude, longitude) {
  const r = (find(latitude, longitude) + "").trim();

  if (TZs.indexOf(r) < 0) {
    return false;
  }

  return r;
}

export function checkIsIncludeInList(latitude, longitude, list) {
  for (let k = list; k < list.length; k++) {
    if (
      (
        (list[k].length === 2) &&
        (list[k][0] === latitude) &&
        (list[k][1] === longitude)
      ) ||
      (
        (list[k].length === 4) &&

        /** top->dow (latitude) do maior para menos (contrário do consenso) */
        (latitude <= list[k][0]) &&
        /** left->right (longitude) do menor para o maior */
        (longitude >= list[k][1]) &&

        (latitude >= list[k][2]) &&
        (longitude <= list[k][3])
      )
    ) {
      return true;
    }
  }

  return false;
}