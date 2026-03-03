import os
import flask
import json
from flask import Flask, send_from_directory, session, redirect, url_for, request, jsonify
from flask_cors import CORS
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from datetime import datetime, timedelta

app = Flask(__name__)
# 세션 유실 방지를 위해 고정 키 사용
app.secret_key = 'mond_cottage_development_key'

# 개발 환경에서의 세션 쿠키 설정 (크로스 오리진 대응)
app.config.update(
    SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SECURE=False,  # 로컬(HTTP) 환경이므로 False
)

# React 프론트엔드(5173)에서의 요청을 허용 (쿠키/세션 전송 포함)
CORS(app, supports_credentials=True, origins=["http://localhost:5173", "http://127.0.0.1:5173"])

SCOPES = ['https://www.googleapis.com/auth/calendar.events']
AMBIENT_DIR = os.path.join(app.root_path, 'static', 'sounds', 'ambient')

# React 프론트엔드 URL (OAuth 콜백 후 리디렉션용)
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://127.0.0.1:5173')

# ==========================================================
#                    상태 확인 API
# ==========================================================

@app.route('/api/status')
def status():
    # 디버깅: 세션에 무엇이 들어있는지 확인
    print(f"DEBUG: Status API Session keys: {list(session.keys())}")
    is_logged_in = 'credentials' in session
    return jsonify({'is_logged_in': is_logged_in})


# ==========================================================
#                    환경음 관련 API
# ==========================================================

@app.route('/api/ambient-sounds')
def get_ambient_sounds():
    ambient_files = []
    if os.path.exists(AMBIENT_DIR):
        for filename in os.listdir(AMBIENT_DIR):
            if filename.endswith(('.mp3', '.wav')):
                ambient_files.append(filename)
    return jsonify({'sounds': ambient_files})

@app.route('/api/audio/<path:filename>')
def serve_audio(filename):
    return send_from_directory(AMBIENT_DIR, filename)


# ==========================================================
#              구글 캘린더 연동 API
# ==========================================================

# 1. 구글 로그인 시작 - React에서 이 URL로 리디렉트
@app.route('/authorize')
def authorize():
    client_secret_file = os.path.join(app.root_path, 'client_secret.json')
    if not os.path.exists(client_secret_file):
        return jsonify({'error': 'client_secret.json 파일이 프로젝트 폴더에 존재하지 않습니다.'}), 500

    flow = Flow.from_client_secrets_file(client_secret_file, scopes=SCOPES)
    # 구글 콘솔에 등록된 127.0.0.1 주소로 강제 지정
    flow.redirect_uri = "http://127.0.0.1:5000/oauth2callback"

    authorization_url, state = flow.authorization_url(
        access_type='offline', include_granted_scopes='true')
    session['state'] = state
    # PKCE 보안을 위해 code_verifier 저장
    session['code_verifier'] = flow.code_verifier
    print(f"DEBUG: Authorize URL: {authorization_url}")
    print(f"DEBUG: State saved in session: {state}")
    return redirect(authorization_url)


# 2. 구글 OAuth 콜백 → 인증 완료 후 React 프론트엔드로 리디렉션
@app.route('/oauth2callback')
def oauth2callback():
    state = session.get('state')
    code_verifier = session.get('code_verifier')
    print(f"DEBUG: Callback State from session: {state}")
    print(f"DEBUG: Callback Code Verifier from session: {'exists' if code_verifier else 'None'}")
    print(f"DEBUG: Callback State from request: {request.args.get('state')}")

    client_secret_file = os.path.join(app.root_path, 'client_secret.json')
    flow = Flow.from_client_secrets_file(client_secret_file, scopes=SCOPES, state=state)
    flow.redirect_uri = "http://127.0.0.1:5000/oauth2callback"
    # PKCE 보안을 위해 code_verifier 복원
    flow.code_verifier = code_verifier

    authorization_response = request.url
    print(f"DEBUG: Authorization Response URL: {authorization_response}")
    
    try:
        flow.fetch_token(authorization_response=authorization_response)
        print("DEBUG: Token fetched successfully!")
    except Exception as e:
        print(f"DEBUG: Token fetch failed: {str(e)}")
        raise e

    credentials = flow.credentials
    session['credentials'] = {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes
    }

    # 인증 완료 후 React 프론트엔드로 돌아감
    return redirect(FRONTEND_URL)


# 3. 로그아웃 → React 프론트엔드로 리디렉션
@app.route('/api/logout')
def logout():
    if 'credentials' in session:
        session.pop('credentials')
    return redirect(FRONTEND_URL)


# 4. 뽀모도로 완료 시 구글 캘린더에 이벤트 생성
@app.route('/api/add_event', methods=['POST'])
def add_event():
    if 'credentials' not in session:
        return jsonify({'error': '구글 계정으로 로그인해주세요.'}), 401

    credentials = Credentials(**session['credentials'])
    service = build('calendar', 'v3', credentials=credentials)

    now = datetime.utcnow()
    duration = request.json.get('duration', 25)
    subject = request.json.get('subject', '집중 공부')
    start_time = (now - timedelta(minutes=duration)).isoformat() + 'Z'
    end_time = now.isoformat() + 'Z'

    event = {
        'summary': f'✅ {subject} 완료 ({duration}분)',
        'description': 'Gonggong Planner 뽀모도로 앱으로 집중한 시간입니다.',
        'start': {'dateTime': start_time, 'timeZone': 'UTC'},
        'end': {'dateTime': end_time, 'timeZone': 'UTC'},
    }

    service.events().insert(calendarId='primary', body=event).execute()
    return jsonify({'success': True})


# ==========================================================
#                    서버 실행
# ==========================================================

if __name__ == '__main__':
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
    app.run(host='0.0.0.0', port=5000, debug=True)