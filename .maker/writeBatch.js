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
  write_return_status_OrForceUpdate
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
      write_return_status_OrForceUpdate
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

      const r = writeAdress(
        options,
        latitude,
        longitude,
        allItems,
        path,
        fail
      );

      if ((typeof r) !== (typeof latest_write_return)) {
        latest_write_return = r;

        (typeof write_return_status_OrForceUpdate === 'function') &&
          write_return_status_OrForceUpdate(r);

        writeReturnOrForceUpdate_used = true;
      }

      /* FORCE PROGRESS UPDATE */
      (((++loop_count) % force_update_at) === 0) &&
        !writeReturnOrForceUpdate_used &&
        (typeof write_return_status_OrForceUpdate === 'function') &&
        write_return_status_OrForceUpdate(true);


      batch_items = mergeDeep(batch_items, typeof r == 'object' ? r : {});
    }
  );

  return batch_items;
}