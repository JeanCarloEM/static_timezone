import { fread, delfile, writedata, fexists, localNumberFormat, checkParameters, loopDecimalPart, mergeDeep } from "./commom.js";
import { writeBatch } from "./writeBatch.js"

export function makeLat(
  options,
  lt,
  lat_start_dec,
  first_restored_long_start,
  process_path,
  fail,
  update_saved_options,
  update_generated_status,
  id
) {
  checkParameters(
    (p_id, msg, funcName, code, data) => {
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
      ["number", "boolean"],
      ["boolean", "number"],
      "string",
      "function",
      "function",
      "function",
    ],
    [
      options,
      lt,
      lat_start_dec,
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
      return {};
    }
  }

  false && process.log(
    "###",
    "makeLat",
    0,
    {
      lt,
      lt_dec: lat_start_dec,
      first_restored_long_start,
    });

  loopDecimalPart(
    options.decimal_lt_size,
    options.inc_lt_multiply,
    lt,
    options.lat_min,
    options.lat_max,
    (_latitude, decimal) => {
      const is_lat_zero = _latitude % 1 === 0;
      false && process.warn(
        "+++++",
        "makeLat",
        1,
        {
          _latitude,
          decimal,
          is_lat_zero
        });

      if (is_lat_zero) return;
      const latitude = _latitude;
      const lat_dec = `${Math.round((Math.abs(latitude) % 1) * options.decimal_lt_size)}`.padStart(options.precision_lt, '0');

      const saved_process_path_tmp = `${process_path}/${parseInt(lt)}.${lat_dec}.tmp.data.json`;
      const saved_process_path_finished = `${options.destPath}/store/${parseInt(lt)}/${lat_dec}.data.json`;

      let lt_items = read_save_items(saved_process_path_finished, saved_process_path_tmp);
      let old_saved_json = JSON.stringify(lt_items, null, 0);

      for (
        var lg = (
          (typeof first_restored_long_start === "numeric")
            ? first_restored_long_start
            : options.long_min
        );
        lg < options.long_max;
        lg++
      ) {
        false && process.log("&&&", "makeLat", 1,
          {
            _latitude,
            decimal,
            lg,
          });

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

        const n_old_saved_json = JSON.stringify(lt_items, null, 0);

        if (n_old_saved_json != old_saved_json) {
          old_saved_json = n_old_saved_json;
          writedata(saved_process_path_tmp, old_saved_json, true);
          update_saved_options(`${latitude} `, lg, written_or_deleted_count);
        }

        false && process.warn(
          "!!!!!",
          "makeLat",
          1,
          {
            lat_start_dec,
            lat_dec,
            latitude,
            saved_process_path_tmp
          });
      }

      writedata(saved_process_path_finished, JSON.stringify(lt_items, null, 0), true);
      delfile(saved_process_path_tmp);
    },
    lat_start_dec,
    id
  );
}