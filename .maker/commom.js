import fs from 'fs';
import minimist from 'minimist';
import { find } from 'geo-tz';
import PATH from "path"
import { acceptable_continents, TZs } from "./TZs.js"
import colors from 'ansi-colors';

const _argv = minimist(process.argv.slice(2));

export function triggerError(process, msg, funcName, code, data) {
  try {
    process.send({
      error: {
        process, msg, funcName, code, data
      }
    });
  } catch (e) {
  }


  const err = [
    colors.bgBlueBright(` Process ${process} ->`),
    , colors.yellow(`[${code}]`)
    , "|"
    , colors.bgRed(" " + funcName + " ")
    , ":"
    , colors.redBright(msg)
  ].concat(typeof data !== "undefined" ? ["\nData:", data, JSON.stringify(data), "\n"] : []).join(' ');

  throw new Error(err);
}

/**
 *
 * @param {*} options
 * @param {*} id
 * @param {*} fail
 * @returns
 */
export function readSavedProcessingPos(options, id, fail) {
  const process_path = `${options.root}/.process/${`${id}`.padStart(2, "0")}`.trim();
  const saved_process_path = `${process_path}/status.json`.trim();

  const saved = (() => {
    if (fexists(saved_process_path)) {
      try {
        return JSON.parse(fread(saved_process_path));
      } catch (error) {
      }
    }

    return {
      latitude: false,
      longitude_int_part: false,
      builts_skippeds: [0, 0],
      id: id,
      params: options
    };
  })();

  if (JSON.stringify(saved.params, null, 0) !== JSON.stringify(options, null, 0)) {
    return ((typeof fail === 'function') ? fail : triggerError)(id, 'Saved options != actual options.', 'readSavedProcessingPos', 0);
  }

  const first_process_lat = options.lat_min + id;
  const start_lat = saved.latitude === false ? first_process_lat : saved.latitude;
  const start_long = saved.longitude_int_part === false ? options.long_min : parseInt(saved.longitude_int_part);

  return {
    process_path,
    saved_process_path,
    data: saved,
    first_process_lat,
    start_lat,
    start_long
  };
}

/**
 *
 * @param {*} x
 * @param {*} digits
 * @param {*} langOrPad
 * @param {*} padOrland
 * @returns
 */
export function localNumberFormat(x, digits, langOrPad, padOrland) {
  const lang = (
    (typeof langOrPad === 'string')
      ? langOrPad
      : (
        (typeof padOrland === 'string')
          ? padOrland
          : 'pt-BR'
      )
  );

  const padstr = (
    ((check) => {
      return (
        check(padOrland)
          ? padOrland
          : (
            check(langOrPad)
              ? langOrPad
              : false
          )
      );
    })(
      (y) => {
        return (
          (typeof y === 'object') &&
          Array.isArray(y) &&
          (y.length === 2) &&
          (typeof y[0] === 'number') && isFinite(y[0]) &&
          (typeof y[1] === 'string') && (y[1].trim().length > 0)
        );
      }
    )
  );

  digits = Math.abs(digits && isFinite(digits) ? digits : 0);

  x = (x).toLocaleString(
    lang,
    {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }
  );

  if (padstr) {
    return x.padstr(padstr[0], padstr[1]);
  }

  return x;
}

export function checkParameters(fail, identify, names, types, args) {
  if (
    typeof identify !== "string" ||
    !Array.isArray(names) ||
    !Array.isArray(types) ||
    !Array.isArray(args)
  ) {
    console.log("\n\ncheckParameters PARAMTER:\n", identify, names, types, args, "\n\n");

    if (typeof fail === "function") {
      fail('[checkParameters] invalid parameters types.', 'checkParameters', 0);
    }

    throw '[checkParameters] invalid parameters types.';
  }

  let throws = false;

  if (args.length !== names.length) {
    throws = `Divergent lenghts, ${args.length} arguments provided, expected ${names.length}.`;
  }

  for (let k = 0; k < args.length; k++) {
    if (typeof args[k] === "undefined") {
      throws = `${k}º argument ('${names[k]}') is 'undefined'.`;
      break;
    } else

      if (
        types &&
        types[k] &&
        (
          Array.isArray(types[k])
            ? types[k].indexOf(typeof args[k]) < 0
            : typeof args[k] !== types[k]
        )
      ) {
        throws = `${k}º argument, ('${names[k]}') is '${typeof args[k]}', expected '${types[k]}'.`;
        break;
      }
  }

  throws &&
    (
      (typeof fail === "function")
        ?
        fail :
        triggerError
    )(null, throws, identify, "commom::checkParameters");
}

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

export function has(target, k, istype) {
  return (typeof target === "object") && target.hasOwnProperty(k) && target[k] !== "undefined" && (
    (typeof istype !== 'string') || (typeof target[k] == istype)
  );
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
  const initial = Math.round(Math.abs(typeof start_at === "number" ? start_at : (decimal_size - multiply)));

  for (
    var decimal = initial;
    decimal >= 0;
    decimal -= multiply
  ) {
    const item = (intpart >= 0 ? 1. : - 1.) * (Math.abs(parseFloat(intpart)) + (decimal / decimal_size));

    if ((item < min) || (item > max)) {
      continue;
    }

    clback(
      item,
      decimal
    );
  }
}

export function dirname(x) {
  return PATH.dirname(x);
}

/**
 *
 * @param {*} fpath
 */
export function writedata(fpath, ctt, ignoreEmpty) {
  if (
    ignoreEmpty &&
    (
      (ctt.trim().length == 0) ||
      ctt === "{}" ||
      ctt === "[]"
    )
  ) {
    return;
  }

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

export function isAcceptableTZ(tz) {
  const mt = tz.match(/([^\/]+)\//i);
  const ac = JSON.stringify(acceptable_continents);

  return (
    mt &&
    Array.isArray(mt) &&
    (mt.length >= 2) &&
    (new RegExp(`"${mt[1]}/`, 'i')).test(mt[1])
  );
};

export function getTZ(latitude, longitude) {
  const r = `${find(latitude, longitude)}`.trim();

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