import { fread, delfile, writedata, fexists, localNumberFormat, checkParameters, loopDecimalPart, mergeDeep } from "./commom.js";
import { writeBatch } from "./writeBatch.js"

export function makeLat(
  options,
  lt,
  lt_dec,
  first_restored_long_start,
  process_path,
  fail,
  update_saved_options,
  update_generated_status
) {
  checkParameters(
    (pid, msg, funcName, code, data) => {
      fail(options.id, msg, funcName, code, data);
    },
    'makeLat',
    [
      'options',
      'lt',
      'lt_dec',
      'first_restored_long_start',
      'process_path',
      'fail',
      'update_saved_options',
      'update_generated_status'
    ],
    [
      "object",
      "number",
      "number",
      ["boolean", "number"],
      "string",
      "function",
      "function",
      "function",
    ],
    [
      options,
      lt,
      lt_dec,
      first_restored_long_start,
      process_path,
      fail,
      update_saved_options,
      update_generated_status
    ]
  );

  loopDecimalPart(
    options.decimal_lt_size,
    options.inc_lt_multiply,
    lt,
    options.lat_min,
    options.lat_max,
    (latitude, decimal) => {
      const saved_process_path_tmp = `${process_path}/${localNumberFormat(Math.abs(latitude), options.precision_lt)}.tmp.data.json`;
      const saved_process_path_finished = `${options.destPath}/${parseInt(latitude)}/${(latitude % 1).toFixed(options.precision_lt).substring(2)}.data.json`;

      let lt_items = {};

      try {
        lt_items = JSON.parse(
          fexists(saved_process_path_finished)
            ? fread(saved_process_path_finished)
            : (
              fexists(saved_process_path_tmp)
                ? fread(saved_process_path_tmp)
                : '{}'
            )
        );
      } catch (e) {
        fail(null, "Fail to load saved data", "makeLat", 0, e);
      }

      for (
        var lg = (
          (typeof first_restored_long_start === "numeric")
            ? first_restored_long_start
            : options.long_min
        );
        lg < options.long_max;
        lg++
      ) {
        first_restored_long_start = false;
        let written_or_deleted_count = [0, 0];

        mergeDeep(
          lt_items,
          writeBatch(
            options,
            latitude,
            lg,
            lt_items,
            fail,
            update_generated_status,
            /**
             * written_or_deleted_callback()
             * @param {*} builtOrDeleted
             */
            (builtOrDeleted) => {
              const idk = (builtOrDeleted > 0) ? 0 : (builtOrDeleted < 0 ? 1 : false);

              if (idk === false) {
                return fail(null, "Returned 'builtOrDeleted' is not valid", "makeLat", 0, builtOrDeleted);
              }

              written_or_deleted_count[idk]++;
            }
          )
        );

        writedata(saved_process_path_tmp, JSON.stringify(lt_items, null, 0), true);
        update_saved_options(latitude, lg, written_or_deleted_count);
      }

      writedata(saved_process_path_finished, JSON.stringify(lt_items, null, 0), true);
      delfile(saved_process_path_tmp);
    },
    lt_dec
  );
}