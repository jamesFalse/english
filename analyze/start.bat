@echo off
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)
echo Installing dependencies...
call venv\Scripts\activate
pip install -r requirements.txt
start "" http://127.0.0.1:5001
echo Starting Flask server...
python app.py
pause
