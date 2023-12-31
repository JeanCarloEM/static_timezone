import fs from 'fs';
import minimist from 'minimist';
import { find } from 'geo-tz';
import PATH from "path"
import { acceptable_continents, TZs } from "./TZs.js"
import colors from 'ansi-colors';
import { exec } from 'child_process';

const _argv = minimist(process.argv.slice(2));

export function LOG(...args) {
  console.log(...args);
}

export function fixDecimal(x, count) {
  return parseFloat(x.toFixed(count));
}

export function triggerMessage(level, process, msg, funcName, code, data) {
  level = level.toLowerCase().trim();
  const message = [
    (
      level === "error"
        ? colors.bgRedBright
        : (
          level === 'warn'
            ? colors.bgYellowBright
            : colors.bgCyanBright
        )
    )(colors.black(` ${level.toUpperCase()} `))
    , colors.bgBlueBright(` ${process >= 0 ? process : "MAIN"} `),
    , colors.bgWhiteBright(colors.black(` ${funcName} `))
    , colors.yellow(`(${code})`)
    , ":"
    , colors.redBright(msg)
  ].concat(typeof data !== "undefined" ? ["Data:", (() => {
    try {
      return JSON.stringify(data);
    } catch (error) {
      return data;
    }

  })(), "\n"] : []).join(' ');

  console.log(message);
  return message;
}

export function triggerError(process, msg, funcName, code, data) {
  try {
    process.send({
      error: {
        process, msg, funcName, code, data
      }
    });
  } catch (e) {
  }

  throw new Error(triggerMessage('error', process, msg, funcName, code, data));
}

/**
 *
 * @param {*} options
 * @param {*} id
 * @param {*} fail
 * @returns
 */
export function readSavedProcessingPos(options, id, fail, fpath) {
  const process_path = `${options.root}/.process/${fpath ? fpath : (`${(id)}`.padStart(2, "0"))}`.trim();
  const saved_process_path = `${process_path}/status.json`.trim();

  const saved = (() => {
    if (fexists(saved_process_path)) {
      try {
        return JSON.parse(fread(saved_process_path));
      } catch (error) {
      }
    }

    return {
      latitude: -1000,
      longitude_int_part: -1000,
      builts_skippeds: [0, 0],
      id: id,
      params: options
    };
  })();

  if (JSON.stringify(saved.params, null, 0) !== JSON.stringify(options, null, 0)) {
    return ((typeof fail === 'function') ? fail : triggerError)(id, 'Saved options != actual options.', 'readSavedProcessingPos', 0);
  }

  const is_start = saved.latitude === -1000;
  const first_process_lat = options.lat_min + (is_start ? id : 0);
  const start_lat = is_start ? first_process_lat : saved.latitude;
  const start_long = saved.longitude_int_part === -1000 ? options.long_min : parseInt(saved.longitude_int_part);

  return {
    process_path,
    saved_process_path,
    data: saved,
    first_process_lat,
    start_lat,
    start_long,
    continue: !is_start ? 1 : 0
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
          (typeof y[1] === 'string') && (y[1].length > 0)
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
    return `${x}`.padStart(padstr[0], padstr[1]);
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
  const digits = Math.round(Math.log(decimal_size) / (Math.log(2) + Math.log(5)));
  intpart = parseInt(intpart);

  const initial = parseFloat(
    fixDecimal(
      (
        (
          (() => {
            let pre = Math.round(
              Math.abs(
                typeof start_at === "number"
                  ? start_at
                  : (decimal_size - multiply)
              )
            );
            pre = (pre > 0 && pre < 1) ? pre * decimal_size : pre;
            return (pre == decimal_size) ? pre - multiply : pre;
          })()
        )
        / decimal_size
      ), digits) + ""
  );

  multiply = parseFloat(Math.abs(multiply / decimal_size).toFixed(digits) + "");

  false && process.log(">>>", 'loopDecimalPart', 0, {
    intpart,
    digits,
    initial,
    decimal_size,
    multiply,
    min,
    max,
    start_at
  });

  for (
    let decimal = initial;
    decimal >= 0;
    decimal = fixDecimal((decimal - multiply), digits)
  ) {
    (`${decimal}`.length > (digits) + 2) && process.error("decimal length > precision", 'loopDecimalPart', 0, { decimal, multiply });

    const item = (intpart >= 0 ? 1. : - 1.) * (Math.abs(intpart) + decimal);

    false && process.log("---()", 'loopDecimalPart', 0, { decimal, multiply, item, test: ((item < min) || (item > max)) });

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


export function cmd(command, cb) {
  return exec(command, function (err, stdout, stderr) {
    if (err != null) {
      return cb(new Error(err), null);
    } else if (typeof (stderr) != "string") {
      return cb(new Error(stderr), null);
    } else {
      return cb(null, stdout);
    }
  });
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

  cmd(`git add "${fpath}"`, (e, r) => {

  });
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
    (new RegExp(`"${mt[1]}"`, 'i')).test(ac)
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
    const item = list[k];

    if (
      (
        (item.length === 2) &&
        (item[0] === latitude) &&
        (item[1] === longitude)
      ) ||
      (
        (item.length === 4) &&

        /** top->dow (latitude) from + to - */
        (latitude <= item[0]) &&
        /** left->right (longitude) from - to + */
        (longitude >= item[1]) &&

        (latitude >= item[2]) &&
        (longitude <= item[3])
      )
    ) {
      return true;
    }
  }

  return false;
}