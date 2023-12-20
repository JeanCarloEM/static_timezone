import { writeAdress } from "./writeAdress.js";
import { checkParameters, mergeDeep, loopDecimalPart } from "./commom.js";

export const force_update_at = 10;

export function writeBatch(
  options,
  latitude,
  long,
  allItems,
  path,
  fail,
  update_generated_status
) {
  checkParameters(
    fail, 'writeBatch',
    [
      'options',
      'latitude',
      'long',
      'allItems',
      'path',
      'fail',
      'write_return_status_OrForceUpdate'
    ],
    [
      'object',
      'number',
      'number',
      'object',
      'string',
      "function",
      "function"
    ],
    [
      options,
      latitude,
      long,
      allItems,
      path,
      fail,
      update_generated_status
    ]
  );

  let batch_items = {};
  let latest_write_return = {}
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

      const written_value = writeAdress(
        options,
        latitude,
        longitude,
        allItems,
        path,
        (generated_value) => {
          if (
            ((typeof generated_value) !== (typeof latest_write_return)) ||

            (
              (typeof generated_value === "number")
              &&
              generated_value !== latest_write_return
            )

          ) {
            latest_write_return = generated_value;

            (typeof update_generated_status === 'function') &&
              update_generated_status(generated_value);

            writeReturnOrForceUpdate_used = true;
          }
        },
        fail
      );

      /* FORCE PROGRESS UPDATE */
      (((++loop_count) % force_update_at) === 0) &&
        !writeReturnOrForceUpdate_used &&
        (typeof update_generated_status === 'function') &&
        update_generated_status(true);

      mergeDeep(batch_items, typeof r == 'object' ? written_value : {});
    }
  );

  return batch_items;
}