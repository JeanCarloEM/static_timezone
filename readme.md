# Static TimeZone from GCS

Designed specifically for IOT boards with **very low memory**, which may face difficulties when working with a REST API with many return byes, or even parsing JSON returns, this library creates simple text files, containing ONLY the raw time zone, for approximate geographic location .

The Geographic Coordinate System (*CGS*), which uses latitude and longitude to define location, is truncated in this library to just 2 decimal digits, which is accurate enough to identify the TIME ZONE of the region/country, in addition to allowing identify the time of sunset and sunrise.

Truncating the original 6 digits to just 2 digits represents a negligible loss of accuracy for the use cases where most IOT are applied.

All files are static and can be served by a basic WEB server, or even by github pages.

**Note** however, that there are more than **648,000,000** files, which despite being no more than 48 bytes (which would give a maximum of **31GB**), in reality occupy more than **333GB** of disk space with the exFat file system of 512 bytes cluster or **2.7TB** for partition with a 4K cluster.