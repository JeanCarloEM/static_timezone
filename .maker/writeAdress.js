const { find } = require('geo-tz');
const { has, fexists, fread, fsize } = require("commom.js");
const isSea = require('is-sea');

/**
 *
 * @param {*} fpath
 * @param {*} zone
 * @param {*} isjson
 * @param {*} fail
 * @returns
 */
function checkNeedWrite(fpath, zone, isjson, fail) {
  if (fexists(`${fpath}`)) {
    let content = " ";

    try {
      if (fsize(fpath).size < 3) {
        return true;
      }

      content = (isjson ? JSON.parse : ((r) => r))(fread(fpath, 'ascii').trim());
    } catch (e) {
      return typeof fail === 'function' && fail(e, "checkNeedWrite", 1);
    }

    /**
     * check file, and content
     */
    return (isjson)
      ? content.tz !== zone
      : content !== zone;
  }

  return true;
}


export function writeAdress(
  options,
  latitude,
  longitude,
  allItems,
  path,
  fail
) {
  /** IGNORE OCEAN */
  if (isSea.get(latitude, longitude)) {
    return 1; // in ocean
  }

  const ltpath = String(latitude.toFixed(options.precision_lt)).replace(/[,\.]/, '/');
  const lgpath = String(longitude.toFixed(options.precision_lg)).replace(/[,\.]/g, '/');
  const full_path = `${path}/lat/${ltpath}/long/${lgpath}`;

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
        ? allItems[`${latitude}`][`${longitude}`].trim()
        // not Saved
        : false
    );

    const calczone = (find(latitude, longitude) + "").trim();

    return (
      (presaved && (presaved !== calczone))
        ? calczone
        : (
          // need save individual?
          (!options.save_raw && !options.save_json)
            // NO need save individual?
            ? false
            // need save individual
            : (
              // is divergent content or invalid individual saved?
              (options.save_raw && checkNeedWrite(`${full_path}`, false, fail)) ||
              (options.save_json && checkNeedWrite(`${full_path}.json`, true, fail))
            ) ? calczone
              // dont need save
              : false
        )
    );
  })());

  // need to save
  if (zone) {
    try {
      if (options.save_json) {
        writedata(`${__dest}.json`, JSON.stringify({ tz: `${zone}` }, null, 0));
      }

      if (options.save_raw) {
        writedata(`${__dest}`, `${zone}`);
      }
    } catch (e) {
      return typeof fail === 'function' && fail(e, "writeAdress", 1);
    }

    return {
      [latitude]: {
        [longitude]: zone
      }
    };
  }

  return 0;// is skipped
}