@echo off
setlocal
set EXPO_PUBLIC_API_URL=http://10.215.104.231:5000/api
set EXPO_PUBLIC_ALLOW_CLEARTEXT=true
call npx expo prebuild --platform android --no-install
if errorlevel 1 exit /b %errorlevel%
cd /d %~dp0..\android
call gradlew assembleRelease
exit /b %errorlevel%

