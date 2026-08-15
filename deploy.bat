@echo off
cd /d c:\Users\VBJanu\Downloads\interview-analyzer\interview-analyzer
git add .
git commit -m "feat: Neon PostgreSQL connected + voice-to-voice interview + deploy ready"
git branch -M main
git push -u origin main
echo.
echo ========================================
echo PUSHED TO GITHUB SUCCESSFULLY
echo ========================================
pause
