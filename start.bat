@echo off
title BEC Accounts & Finance System
echo ================================================================
echo BHUBANESWAR ENGINEERING COLLEGE - ACCOUNTS & FINANCE SYSTEM
echo ================================================================
echo Application URL: http://localhost:5000/login.html
echo Press Ctrl+C in this window to stop the server.
echo ================================================================
cd backend
start http://localhost:5000/login.html
node server.js
pause
