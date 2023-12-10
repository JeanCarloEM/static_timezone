# Static TimeZone from GCS

Designed specifically for IOT boards with **very low memory**, which may face difficulties when working with a REST API with many return byes, or even parsing JSON returns, this library creates simple text files, containing ONLY the raw timezone for a geographic location approximate.

The Geographic Coordinate System (_CGS_), which uses latitude and longitude to define location, is truncated in this library to just 2 decimal digits, which is accurate enough to identify the TIMEZONE of the region/country, in addition to allowing identify the time of sunset and sunrise.

Truncating the original 6 digits to just 2 digits represents a negligible loss of accuracy for the use cases where most IOT are applied.

All files are static and can be served by a basic WEB server, or even by github pages.

#### ATTENTION! Small but takes up a lot of disk space

It is estimated that there are more than **577,800,000** files, which despite not having more than 48bytes (which would give a maximum of **31GB**), in reality occupy more than **333GB** of disk space with the exFat file system of 512 bytes cluster or **2.7TB** for partition with a 4K cluster.

## API

`/from/gcs/2-digit/lat/{LATITUDE}/long/{LONGITUDE}`

- `{LATITUDE}` is a number that goes from -90.00 to +90.00.
- `{LONGITUDE}` is a number that goes from -180.00 to +180.00.
- In both, the decimal separation symbol must be converted to a slash (/) and the decimal part of the number must be filled with leading zeros to contain exactly 2 digits.
- The plus sign should not be inserted.

### Practical examples:

- **Tesker in Niger**: latitude _15.067980_ and longitude _10.728149_ => `/from/gcs/2-digit/lat/15/06/long/9/72`
- **Brazilian in Brazil**: latitude -15.831315* and longitude \*-47.881165\* => `*/from/gcs/2-digit/lat/-15/83/long/-47/88`
- **New York in USA**: latitude _40.657462_ and longitude _-74.014893_ => `/from/gcs/2-digit/lat/40/65/long/-74/01`
- **Sydiney in Australia**: latitude _-33.898917_ and longitude _151.303711_ => `/from/gcs/2-digit/lat/-33/89/long/151/30`
