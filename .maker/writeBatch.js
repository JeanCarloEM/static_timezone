const { writeAdress } = require("writeAdress.js");
const { mergeDeep, loopDecimalPart } = require("commom.js");

export function writeBatch(
  options,
  latitude,
  long,
  allItems,
  path,
  fail,
  is_non_object
) {
  let batch_items = {};
  let latest_write_return = {}

  loopDecimalPart(
    options.decimal_lg_size,
    options.inc_lg_multiply,
    long,
    options.long_min,
    options.long_max,
    (longitude) => {
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
        (typeof is_non_object === 'function') && is_non_object(r);
      }

      batch_items = mergeDeep(batch_items, typeof r == 'object' ? r : {});
    }
  );

  return batch_items;
}