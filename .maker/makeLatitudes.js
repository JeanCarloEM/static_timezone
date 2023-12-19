import { writeBatch } from "./writeBatch.js";

import { makeLat } from "./makeLat.js";
import { dirname, checkParameters, delfile, writedata, mergeDeep, has, fexists, fread, fsize } from "./commom.js";
import { force_update_at } from "./writeBatch.js";

/**
 *
 * @param {*} options
 * @param {*} saved_process_path
 * @param {*} lt
 * @returns
 */
export function readSavedProcessingPos(options, saved_process_path) {
  if (fexists(saved_process_path)) {
    try {
      return JSON.parse(fread(saved_process_path));
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
  checkParameters(
    fail,
    'makeLatitudes',
    [
      'options',
      'id',
      'path',
      'fail',
      'clback'
    ],
    [
      'object',
      'number',
      'string',
      'function',
      'function'
    ],
    [
      options,
      id,
      path,
      fail,
      clback
    ]
  );

  const process_path = `${dirname(path)}/${`${id}`.padStart(2, "0")}.process`;
  const saved_process_path = `${process_path}/main.json`;
  const saved_process_data = readSavedProcessingPos(options, saved_process_path);

  if (JSON.stringify(saved_process_data.params, null, 0) !== JSON.stringify(options, null, 0)) {
    return typeof fail === 'function' && fail('Options saved isnot equal to actual options', "makeLatitudes", 1);
  }

  const first_lat = options.lat_min + id;
  const start_lat = saved_process_data.latitude === false ? first_lat : saved_process_data.latitude;

  let allItems = {};
  let first_retored_runtime = true;
  let latest_write_return = {}

  let last_latitude = first_lat;
  let last_long_int_part = (
    first_retored_runtime
      ? saved_process_data.longitude_int_part
      : false
  );

  for (var lt = Math.round(start_lat); lt < options.lat_max; lt += options.qtd_process) {
    let saved_process_path_tmp = `${process_path}/${(lt >= 0 ? "+" : "-")}${`${Math.abs(lt)}`.padStart(3, '0')}.tmp.data.json`;
    let saved_process_path_finished = `${path}/${(lt >= 0 ? "+" : "-")}${`${Math.abs(lt)}`.padStart(3, '0')}.data.json`;

    let lt_items = JSON.parse(
      fexists(saved_process_path_finished)
        ? fread(saved_process_path_finished)
        : (
          fexists(saved_process_path_tmp)
            ? fread(saved_process_path_tmp)
            : '{}'
        )
    );

    makeLat(
      options,
      lt,
      (start_lat % 1) * options.precision,
      last_long_int_part,
      lt_items,
      path,
      fail,
      (batch_items, latitude, long_int_part) => {
        last_latitude = latitude;
        last_long_int_part = long_int_part;

        mergeDeep(lt_items, batch_items);

        /* WRITE TEMP MERGED JSON */
        if (options.save_merged_json) {
          writedata(saved_process_path_tmp, JSON.stringify(lt_items, null, 0));
        }

        /* WRITE RUNTIME CONDITIONS */
        writedata(saved_process_path, JSON.stringify({
          latitude: latitude,
          longitude_int_part: options.long_min,
          id: id,

          params: options
        }));

        clback(id, first_lat, latitude, long_int_part, latest_write_return, false);
      },
      (write_return) => {
        if (typeof write_return === "boolean") {
          return clback(id, first_lat, last_latitude, last_long_int_part, write_return, force_update_at);
        }

        if ((typeof write_return) !== (typeof latest_write_return)) {
          latest_write_return = write_return;
          clback(id, first_lat, last_latitude, last_long_int_part, write_return, true);
        }
      }
    );

    first_retored_runtime = false;

    writedata(saved_process_path_finished, JSON.stringify(lt_items, null, 0));
    delfile(saved_process_path_tmp);
  }

  clback(id, first_lat, last_latitude, last_long_int_part, latest_write_return, {
    finished: allItems
  });
}