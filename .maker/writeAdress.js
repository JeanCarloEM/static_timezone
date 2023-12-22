import {
  checkParameters,
  checkIsIncludeInList,
  delfile,
  isOcean,
  getTZ,
  has,
  isAcceptableTZ,
  writedata
} from "./commom.js";
import { forceInclude } from "./forceInclude.js"
import { forceIgnore } from "./forceIgnore.js"

export const default_extension = ".txt";

export const adress_isocean = 1;
export const adress_isforced_ignore = 3;
export const adress_isinvalid_tz = 2;
export const adress_unacceptable_tz = 3;
export const adress_unchanged = 4;


function delsaveds(p) {
  delfile(`${p}${default_extension}`);
  delfile(`${p}.json`);
}

/**
 *
 * @param {*} options
 * @param {*} path
 * @param {*} tz
 * @param {*} fail
 * @returns
 */
function makeAdressFile(options, path, tz, fail) {
  console.log("----", fpath, "\n");

  try {
    if (options.save_json) {
      writedata(`${path}.json`, JSON.stringify({ tz: `${tz}` }, null, 0));
    }

    if (options.save_raw) {
      writedata(`${path}${default_extension}`, `${tz}`);
    }
  } catch (e) {
    return typeof fail === 'function' && fail(e, "writeAdress", 1);
  }
}

/**
 *
 * @param {*} options
 * @param {*} latitude
 * @param {*} longitude
 * @param {*} allItems
 * @param {*} path
 * @param {*} fail
 * @returns
 */
export function writeAdress(
  options,
  latitude,
  longitude,
  allItems,
  update_generated_status,
  written_or_deleted_callback,
  fail
) {
  checkParameters(
    fail, 'writeAdress',
    [
      'options',
      'latitude',
      'longitude',
      'allItems',
      'update_generated_status',
      'written_or_deleted_callback',
      'fail'
    ],
    [
      'object',
      'number',
      'number',
      'object',
      "function",
      'function',
      "function"
    ],
    [
      options,
      latitude,
      longitude,
      allItems,
      update_generated_status,
      written_or_deleted_callback,
      fail
    ]
  );

  const ltpath = String(latitude.toFixed(options.precision_lt)).replace(/[,\.]/, '/');
  const lgpath = String(longitude.toFixed(options.precision_lg)).replace(/[,\.]/g, '/');
  const full_path = `${options.destPath}/lat/${ltpath}/long/${lgpath}`;

  const is_ocean = isOcean(latitude, longitude);
  const is_forced_Ignored = !is_ocean && checkIsIncludeInList(latitude, longitude, forceIgnore);

  let defVal = 0;

  /** IGNORE OCEAN */
  if (
    (is_ocean || is_forced_Ignored) &&
    // forceInclude takes precedence over other options
    !checkIsIncludeInList(latitude, longitude, forceInclude)
  ) {
    defVal = is_ocean ? adress_isocean : adress_isforced_ignore;
  }

  if (!defVal) {
    /**
     * get zone from saved or generated
     * FALSE if not need to save
     */
    const zone = ((() => {
      const presaved = (
        (
          has(allItems, `${latitude}`) &&
          has(allItems[`${latitude}`], `${longitude}`)
        )
          // saved
          ? `${allItems[`${latitude}`][`${longitude}`]}`.trim()
          // not Saved
          : false
      );

      const calczone = getTZ(latitude, longitude);

      if ((calczone === false) || (typeof calczone !== "string") || (`${calczone}`.length == 0)) {
        return adress_isinvalid_tz;
      }

      if (!isAcceptableTZ(calczone)) {
        return adress_unacceptable_tz;
      }

      return (
        presaved
          ? (
            (presaved !== calczone)
              ? calczone
              : false
          )
          : calczone

      );
    })());

    defVal = (
      (!zone)
        ? adress_unchanged
        : (((value) => {
          if (typeof value === 'string') {
            makeAdressFile(options, full_path, value, fail)
          }
          return value;
        })(zone))
    );
  }

  if (typeof defVal !== 'string') {
    /** delete if  file is before created and unecesary*/
    delsaveds(`${full_path}`);
  }

  (typeof written_or_deleted_callback === 'function') &&
    written_or_deleted_callback((typeof defVal === 'string') ? 1 : -1);


  (typeof update_generated_status === 'function') && update_generated_status(defVal);

  return {
    [latitude.toFixed(options.precision_lt)]: {
      [longitude.toFixed(options.precision_lg)]: defVal
    }
  };
}