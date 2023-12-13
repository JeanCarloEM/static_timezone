const { makeLat } = require("makeLat.js");
const { delfile, writedata, mergeDeep, has, fexists, fread, fsize } = require("commom.js");

/**
 *
 * @param {*} options
 * @param {*} saved_pos_path
 * @param {*} lt
 * @returns
 */
export function readSavedProcessingPos(options, saved_pos_path) {
  if (fexists(saved_pos_path)) {
    try {
      return JSON.parse(fread(saved_pos_path));
    } catch (error) {
    }
  }

  return {
    latitude: false,
    longitude_int_part: Math.round(options.long_min),
    id: -1,

    params: options
  };
}

export function makeLatitudes(
  options,
  id,
  path,
  fail,
  clback
) {
  const saved_pos_path = `${path}/${id}.process.json`;
  const saved_pos_path_tmp = `${path}/${id}.tmp.data.json`;
  const saved_pos_path_finished = `${path}/${id}.finidhed.data.json`;
  const saved_pos_data = readSavedProcessingPos(options, saved_pos_path);

  if (JSON.stringify(saved_pos_data.params, null, 0) !== JSON.stringify(options, null, 0)) {
    return typeof fail === 'function' && fail('Otptions saved isnot equal to actual options', "makeLatitudes", 1);
  }

  const first_lat = options.lat_min + id;
  const start_lat = saved_pos_data.latitude === false ? first_lat : saved_pos_data.latitude;

  let allItems = {};
  let first_retored_runtime = true;
  let latest_write_return = {}

  for (var lt = start_lat.toFixed(0); lt < options.lat_max; lt += options.qtd_process) {
    makeLat(
      options,
      lt,
      (start_lat % 1) * options.precision,
      (
        first_retored_runtime
          ? saved_pos_data.longitude_int_part
          : false
      ),
      allItems,
      path,
      fail,
      (batch_items, latitude, long_int_part) => {
        allItems = mergeDeep(allItems, batch_items);

        /* WRITE TEMP MERGED JSON */
        if (options.save_merged_json) {
          writedata(saved_pos_path_tmp, JSON.stringify(allItems, null, 0));
        }

        /* WRITE RUNTIME CONDITIONS */
        writedata(saved_pos_path, JSON.stringify({
          latitude: latitude,
          longitude_int_part: options.long_min,
          id: id,

          params: options
        }));

        clback(id, first_lat, latitude, long_int_part, actual_write_return, false);
      },
      (write_return) => {
        if ((typeof write_return) !== (typeof latest_write_return)) {
          actual_write_return = write_return;
          clback(id, first_lat, latitude, long_int_part, write_return, true);
        }
      }
    );

    first_retored_runtime = false;
  }

  writedata(saved_pos_path_finished, JSON.stringify(allItems, null, 0));
  delfile(saved_pos_path_tmp);

  clback(id, first_lat, latitude, long_int_part, actual_write_return, {
    finished: allItems
  });
}