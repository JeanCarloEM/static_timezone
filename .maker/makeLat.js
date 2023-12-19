import { checkParameters, loopDecimalPart } from "./commom.js";
import {writeBatch} from "./writeBatch.js"

export function makeLat(
  options,
  lt,
  lt_dec,
  first_restored_long_start,
  allItems,
  path,
  fail,
  callback,
  write_return_status
) {
  checkParameters(
    fail,
    'makeLat',
    [
      'options',
      'lt',
      'lt_dec',
      'first_restored_long_start',
      'allItems',
      'path',
      'fail',
      'callback',
      'write_return_status'
    ],
    [
      "object",
      "number",
      "number",
      "number",
      "object",
      "string",
      "function",
      "function",
      "function"
    ],
    [
      options,
      lt,
      lt_dec,
      first_restored_long_start,
      allItems,
      path,
      fail,
      callback,
      write_return_status
    ]
  );

  loopDecimalPart(
    options.decimal_lt_size,
    options.inc_lt_multiply,
    lt,
    options.lat_min,
    options.lat_max,
    (latitude) => {
      for (
        var lg = (
          typeof first_restored_long_start === "numeric"
            ? first_restored_long_start
            : options.long_min
        );
        lg < options.long_max;
        lg++
      ) {
        first_restored_long_start = false;

        callback(writeBatch(
          options,
          latitude,
          lg,
          allItems,
          path,
          fail,
          write_return_status
        ), latitude, lg);
      }
    },
    lt_dec
  );
}