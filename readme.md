# Static TimeZone from GCS

Designed specifically for IOT boards with **very low memory**, which may face difficulties when working with a REST API with many return byes, or even parsing JSON returns, this library creates simple text files, containing ONLY the raw timezone for a geographic location approximate.

The Geographic Coordinate System (_CGS_), which uses latitude and longitude to define location, is truncated in this library to just 2 decimal digits, which is accurate enough to identify the TIMEZONE of the region/country, in addition to allowing identify the time of sunset and sunrise.

Truncating the original 6 digits to just 2 digits represents a negligible loss of accuracy for the use cases where most IOT are applied.

All files are static and can be served by a basic WEB server, or even by github pages.

**Note** however, that there are more than **648,000,000** files, which despite being no more than 48 bytes (which would give a maximum of **31GB**), in reality occupy more than **333GB** of disk space with the exFat file system of 512 bytes cluster or **2.7TB** for partition with a 4K cluster.

## API

`gcs/2-digit/{LATITUDE}/{LONGITUDE}`

- `{LATITUDE}` is a number that goes from -90.00 to +90.00.
- `{LONGITUDE}` is a number that goes from -180.00 to +180.00.
- In both, the decimal separation symbol must be converted to a slash (/) and the decimal part of the number must be filled with leading zeros to contain exactly 2 digits.
- The plus sign should not be inserted.

### Practical examples:

- **Tesker in Niger** = latitude 15.067980 and longitude 10.728149 = _gcs/2-digit/**15**/**06**/**9**/**72**/_
- **Brazilian in Brazil** = latitude -15.831315 and longitude -47.881165 = _gcs/2-digit/**-15**/**83**/**-47**/**88**/_
- **New York in USA** = latitude 40.657462 and longitude -74.014893 = _gcs/2-digit/**40**/**65**/**-74**/**01**/_
- **Sydiney in Australia** = latitude -33.898917 and longitude 151.303711 = _gcs/2-digit/**-33**/**89**/**151**/**30**/_
