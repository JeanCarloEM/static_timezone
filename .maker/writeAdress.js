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
import { forceInclude as force_list } from "./forceInclude.js"
import { forceIgnore as ignore_list } from "./forceIgnore.js"

export const default_extension = ".txt";

export const adress_isocean = 1;
export const adress_isinvalid_tz = 2;
export const adress_isforced_ignore = 3;
export const adress_unchanged = 4;
export const adress_unacceptable_tz = 5;


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
  try {
    if (options.save_json) {
      writedata(`${path}.json`, JSON.stringify({ tz: `${tz}` }, null, 0));
    }

    if (options.save_raw) {
      writedata(`${path}${default_extension}`, `${tz}`);
    }
  } catch (e) {
    return typeof fail === 'function' && fail(e.message, "writeAdress", 1, e);
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

  false && process.log(
    "===",
    'writeAdress',
    0,
    {
      latitude,
      longitude
    });

  const lat_int = Math.floor(latitude);
  const lat_dec = `${Math.round((Math.abs(latitude) % 1) * options.decimal_lt_size)}`.padStart(options.precision_lt, '0');
  const lg_int = Math.floor(longitude);
  const lg_dec = `${Math.round((Math.abs(longitude) % 1) * options.decimal_lg_size)}`.padStart(options.precision_lg, '0');

  const full_path = `${options.destPath}/lat/${lat_int}/${lat_dec}/long/${lg_int}/${lg_dec}`;

  let defVal = (
    checkIsIncludeInList(latitude, longitude, force_list)
      ? false
      : (
        isOcean(latitude, longitude)
          ? adress_isocean
          : (
            checkIsIncludeInList(latitude, longitude, ignore_list)
              ? adress_isforced_ignore
              : false
          )
      )
  );

  if (!defVal) {
    /**
     * get zone from saved or generated
     * FALSE if not need to save
     */
    const zone = ((() => {
      const presaved = (
        (
          has(allItems, lat_int) &&
          has(allItems[lat_int], lat_dec) &&
          has(allItems[lat_int][lat_dec], lg_int) &&
          has(allItems[lat_int][lat_dec][lg_int], lg_dec)
        )
          // saved
          ? `${allItems[lat_int][lat_dec][lg_int][lg_dec]}`.trim()
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
    [lat_int]: {
      [lat_dec]: {
        [lg_int]: {
          [lg_dec]: defVal
        }
      }
    }
  };
}