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
  update_generated_status,
  id
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

  function read_save_items(finished, tmp) {
    try {
      return JSON.parse(
        fexists(finished)
          ? fread(finished)
          : (
            fexists(tmp)
              ? fread(tmp)
              : '{}'
          )
      );
    } catch (e) {
      fail(null, "Fail to load saved data", "makeLat", 0, e);
    }
  }

  id === 2 && process.log(
    "###",
    "makeLat",
    0,
    {
      lt,
      lt_dec,
      first_restored_long_start,
    });

  loopDecimalPart(
    options.decimal_lt_size,
    options.inc_lt_multiply,
    lt,
    options.lat_min,
    options.lat_max,
    (_latitude, decimal) => {
      id === 0 && process.warn(
        "+++",
        "makeLat",
        1,
        {
          _latitude,
          decimal,
          is_zero: _latitude % 1 === 0,
        });

      if (_latitude % 1 === 0) return;
      const latitude = _latitude;
      const lat_dec = `${Math.round((Math.abs(latitude) % 1) * options.decimal_lt_size)}`.padStart(options.precision_lt, '0');

      const saved_process_path_tmp = `${process_path}/${parseInt(lt)}.${lat_dec}.tmp.data.json`;
      const saved_process_path_finished = `${options.destPath}/${parseInt(lt)}/store/${lat_dec}.data.json`;
      let lt_items = read_save_items(saved_process_path_finished, saved_process_path_tmp);

      for (
        var lg = (
          (typeof first_restored_long_start === "numeric")
            ? first_restored_long_start
            : options.long_min
        );
        lg < options.long_max;
        lg++
      ) {
        id === 2 && process.log("\n\t\t\t\t++", id, "each lg",
          `_latitude: ${_latitude}`,
          `decimal: ${decimal}`,
          `lg: ${lg}`,
          "\n");

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
            },
            id
          )
        );

        writedata(saved_process_path_tmp, JSON.stringify(lt_items, null, 0), true);
        update_saved_options(`${latitude} `, lg, written_or_deleted_count);
      }

      writedata(saved_process_path_finished, JSON.stringify(lt_items, null, 0), true);
      delfile(saved_process_path_tmp);
    },
    lt_dec,
    id
  );
}