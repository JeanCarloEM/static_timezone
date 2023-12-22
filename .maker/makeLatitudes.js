import { writeBatch } from "./writeBatch.js";

import { makeLat } from "./makeLat.js";
import { readSavedProcessingPos, checkParameters, writedata } from "./commom.js";
import { force_update_at } from "./writeBatch.js";

/**
 *
 * @param {*} options
 * @param {*} saved_process_path
 * @param {*} lt
 * @returns
 */

export function makeLatitudes(
  options,
  id,
  fail,
  update_progress,
  //written_or_deleted_callback
) {
  checkParameters(
    fail,
    'makeLatitudes',
    [
      'options',
      'id',
      'fail',
      'update_progress',
      //'written_or_deleted_callback'
    ],
    [
      'object',
      'number',
      'function',
      'function',
      //'function'
    ],
    [
      options,
      id,
      fail,
      update_progress,
      //written_or_deleted_callback
    ]
  );

  const PROCESS = readSavedProcessingPos(options, id);

  let first_retored_runtime = true;

  let last_generated_value = {}
  let last_generated_latitude = PROCESS.first_process_lat;
  let last_generated_longitude = options.long_min;
  let builts_skippeds_status = [PROCESS.data.builts_skippeds[0], PROCESS.data.builts_skippeds[1]];

  for (var lt = Math.round(PROCESS.start_lat); lt < options.lat_max; lt += options.qtd_process) {
    makeLat(
      options,
      lt,
      first_retored_runtime ? (PROCESS.start_lat % 1) * options.precision_lt : options.decimal_lt_size,
      first_retored_runtime ? PROCESS.start_long : options.long_min,
      PROCESS.process_path,
      fail,
      /**
       * update_saved_options()
       *
       * @param {*} latitude
       * @param {*} long_int_part
       * @param {*} written_or_deleted_count
       */
      (latitude, long_int_part, written_or_deleted_count) => {
        last_generated_latitude = latitude;
        last_generated_longitude = long_int_part;

        builts_skippeds_status[0] += written_or_deleted_count[0];
        builts_skippeds_status[1] += written_or_deleted_count[1];

        /* WRITE RUNTIME CONDITIONS */
        writedata(
          PROCESS.saved_process_path,
          JSON.stringify(
            {
              latitude: latitude,
              longitude_int_part: long_int_part,
              builts_skippeds: builts_skippeds_status,
              id: id,

              params: options
            }
          )
        );

        update_progress(id, PROCESS.first_process_lat, latitude, long_int_part, last_generated_value, builts_skippeds_status);
      },
      /**
       * update_generated_status()
       *
       * @param {*} generated_value
       * @returns
       */
      (generated_value) => {
        if ((typeof generated_value) !== (typeof last_generated_value)) {
          last_generated_value = generated_value;
          update_progress(
            id,
            PROCESS.first_process_lat,
            last_generated_latitude,
            last_generated_longitude,
            generated_value,
            builts_skippeds_status
          );
        }
      }
    );

    first_retored_runtime = false;
  }

  update_progress(
    id,
    PROCESS.first_process_lat,
    last_generated_latitude,
    last_generated_longitude,
    last_generated_value,
    {
      finished: 1
    }
  );
}