import { writeAdress } from "./writeAdress.js";
import { checkParameters, mergeDeep, loopDecimalPart } from "./commom.js";

export const force_update_at = 10;

export function writeBatch(
  options,
  latitude,
  long,
  allItems,
  fail,
  update_generated_status,
  written_or_deleted_callback,
  id
) {
  checkParameters(
    fail, 'writeBatch',
    [
      'options',
      'latitude',
      'long',
      'allItems',
      'fail',
      'update_generated_status',
      'written_or_deleted_callback'
    ],
    [
      'object',
      'number',
      'number',
      'object',
      "function",
      "function",
      "function"
    ],
    [
      options,
      latitude,
      long,
      allItems,
      fail,
      update_generated_status,
      written_or_deleted_callback
    ]
  );

  id === 2 && process.log(
    "$$$", 'writeBatch', 1, {
    latitude,
    long,
  });


  let batch_items = {};
  let last_generated_value = {}
  let loop_count = 0;

  loopDecimalPart(
    options.decimal_lg_size,
    options.inc_lg_multiply,
    long,
    options.long_min,
    options.long_max,
    (longitude) => {
      let writeReturnOrForceUpdate_used = false;

      if ((longitude < options.long_min) || (longitude > options.long_max)) {
        return;
      }

      id === 2 && process.log(
        "\\\\\\\\",
        'writeBatch',
        1,
        {
          latitude,
          long,
          longitude
        });

      const written_value = writeAdress(
        options,
        (latitude),
        longitude,
        allItems,
        /**
         * update_generated_status()
         *
         * @param {*} generated_value
         */
        (generated_value) => {
          if (
            ((typeof generated_value) !== (typeof last_generated_value)) ||
            (
              (typeof generated_value === "number") &&
              generated_value !== last_generated_value
            )
          ) {
            last_generated_value = generated_value;

            (typeof update_generated_status === 'function') &&
              update_generated_status(generated_value);

            writeReturnOrForceUpdate_used = true;
          }
        },
        written_or_deleted_callback,
        fail
      );

      /* FORCE PROGRESS UPDATE */
      (((++loop_count) % force_update_at) === 0) &&
        !writeReturnOrForceUpdate_used &&
        (typeof update_generated_status === 'function') &&
        update_generated_status(last_generated_value);

      mergeDeep(batch_items, typeof r == 'object' ? written_value : {});
    }
  );

  return batch_items;
}