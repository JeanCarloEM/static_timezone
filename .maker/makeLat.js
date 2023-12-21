import { fread, writedata, fexists, localNumberFormat, checkParameters, loopDecimalPart, mergeDeep } from "./commom.js";
import { writeBatch } from "./writeBatch.js"

export function makeLat(
  options,
  lt,
  lt_dec,
  first_restored_long_start,
  process_path,
  fail,
  update_saved_options,
  update_generated_status,
  written_or_deleted_callback
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
      'update_generated_status',
      'written_or_deleted_callback'
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
      "function"
    ],
    [
      options,
      lt,
      lt_dec,
      first_restored_long_start,
      process_path,
      fail,
      update_saved_options,
      update_generated_status,
      written_or_deleted_callback
    ]
  );

  loopDecimalPart(
    options.decimal_lt_size,
    options.inc_lt_multiply,
    lt,
    options.lat_min,
    options.lat_max,
    (latitude) => {
      const saved_process_path_tmp = `${process_path}/${localNumberFormat(Math.abs(latitude), options.precision_lt)}.tmp.data.json`;
      const saved_process_path_finished = `${options.destPath}/${parseInt(latitude)}/${(latitude % 1).toFixed(options.precision_lt).substring(2)}.data.json`;

      let lt_items = JSON.parse(
        fexists(saved_process_path_finished)
          ? fread(saved_process_path_finished)
          : (
            fexists(saved_process_path_tmp)
              ? fread(saved_process_path_tmp)
              : '{}'
          )
      );

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

        mergeDeep(
          lt_items,
          writeBatch(
            options,
            latitude,
            lg,
            lt_items,
            fail,
            update_generated_status,
            written_or_deleted_callback
          )
        );

        writedata(saved_process_path_tmp, JSON.stringify(lt_items, null, 0));

        update_saved_options(latitude, lg);
      }

      writedata(saved_process_path_finished, JSON.stringify(lt_items, null, 0));
      delfile(saved_process_path_tmp);
    },
    lt_dec
  );
}