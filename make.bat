cls
xcopy D:\TRAMPO\timezone.jcem.pro\*.js .\ /Y /S
xcopy D:\TRAMPO\timezone.jcem.pro\*.bat .\ /Y /S
node make.js start -t 4 -p 2 -r="db2" -m 2