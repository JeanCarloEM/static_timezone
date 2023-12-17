import { checkIsIncludeInLins, delfile, isOcean, getTZ, has, fexists, fread, fsize } from "./commom.js";
import { forceInclude } from "./forceInclude.js"
import { forceIgnore } from "./forceIgnore.js"

/**
 *
 * @param {*} fpath
 * @param {*} zone
 * @param {*} isjson
 * @param {*} fail
 * @returns
 */
function checkNeedReIndividualFileWrite(fpath, zone, isjson, fail) {
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
  const ltpath = String(latitude.toFixed(options.precision_lt)).replace(/[,\.]/, '/');
  const lgpath = String(longitude.toFixed(options.precision_lg)).replace(/[,\.]/g, '/');
  const full_path = `${path}/lat/${ltpath}/long/${lgpath}`;

  /** IGNORE OCEAN */
  if (
    (
      isOcean(latitude, longitude) ||
      checkIsIncludeInLins(latitude, longitude, forceIgnore)
    ) &&
    // forceInclude takes precedence over other options
    !checkIsIncludeInLins(latitude, longitude, forceInclude)
  ) {
    /** delete if  file is before created and unecesary*/
    delfile(`${full_path}.json`);
    delfile(`${full_path}`);

    return 1; // in ocean
  }

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

    const calczone = getTZ(latitude, longitude);

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

  // need to save
  if (zone) {
    try {
      if (options.save_json) {
        writedata(`${full_path}.json`, JSON.stringify({ tz: `${zone}` }, null, 0));
      }

      if (options.save_raw) {
        writedata(`${full_path}`, `${zone}`);
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