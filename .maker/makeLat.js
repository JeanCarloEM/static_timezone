export function makeLat(
  options,
  lt,
  lt_dec,
  first_restored_long_start,
  allItems,
  path,
  fail,
  callback,
  is_non_object
) {
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
        lg < long_max;
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
          is_non_object
        ), latitude, lg);
      }
    },
    lt_dec
  );
}