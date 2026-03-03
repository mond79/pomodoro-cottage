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
import traceback

# 배포 환경에서 http 요청을 허용 (Render의 프록시 내부 통신 대응)
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

app = Flask(__name__)
# 세션 유실 방지를 위해 고정 키 사용
app.secret_key = 'mond_cottage_development_key'

# 세션 쿠키 설정 (크로스 오리진 및 배포 환경 대응)
is_prod = 'onrender.com' in os.environ.get('FRONTEND_URL', '') or os.environ.get('PORT')
app.config.update(
    SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SECURE=is_prod,  # 배포 환경(Render)에서는 True
)

# React 빌드 폴더 경로 설정 (배포 시 frontend/dist 서빙)
dist_folder = os.path.join(app.root_path, 'frontend', 'dist')
app.static_folder = dist_folder

# React 프론트엔드에서의 요청을 허용 (쿠키/세션 전송 포함)
CORS(app, supports_credentials=True, origins=[
    "http://localhost:5173", 
    "http://127.0.0.1:5173",
    "https://mond-cottage.onrender.com"
])

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
    # 클라이언트 비밀키 정보 가져오기 (파일 우선, 없으면 환경 변수)
    client_secret_file = os.path.join(app.root_path, 'client_secret.json')
    if os.path.exists(client_secret_file):
        flow = Flow.from_client_secrets_file(client_secret_file, scopes=SCOPES)
    else:
        # 파일이 없으면 환경 변수에서 읽기
        raw_config = json.loads(os.environ.get('GOOGLE_CLIENT_SECRET_JSON', '{}'))
        client_config = raw_config.get('web') or raw_config.get('installed') or raw_config
        
        if not client_config or 'client_id' not in client_config:
            return jsonify({'error': 'client_secret.json 파일 혹은 GOOGLE_CLIENT_SECRET_JSON 환경 변수가 올바르지 않습니다.'}), 500
            
        flow = Flow.from_client_config({'web': client_config} if 'web' not in raw_config and 'installed' not in raw_config else raw_config, scopes=SCOPES)

    # 리디렉션 URI를 현재 접속한 호스트에 맞춰 동적 생성
    base_url = request.host_url.rstrip('/')
    if "onrender.com" in base_url:
        base_url = base_url.replace("http://", "https://")
    flow.redirect_uri = f"{base_url}/oauth2callback"

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

    # 클라이언트 비밀키 정보 가져오기
    client_secret_file = os.path.join(app.root_path, 'client_secret.json')
    if os.path.exists(client_secret_file):
        flow = Flow.from_client_secrets_file(client_secret_file, scopes=SCOPES, state=state)
    else:
        # 파일이 없으면 환경 변수에서 읽기
        raw_config = json.loads(os.environ.get('GOOGLE_CLIENT_SECRET_JSON', '{}'))
        # 구글 JSON 파일은 보통 {"web": {...}} 또는 {"installed": {...}} 형태임
        client_config = raw_config.get('web') or raw_config.get('installed') or raw_config
        
        if not client_config or 'client_id' not in client_config:
            return f"<h2>설정 오류</h2><p>GOOGLE_CLIENT_SECRET_JSON 환경 변수 형식이 올바르지 않습니다.</p><pre>{json.dumps(raw_config, indent=2)}</pre>", 500
            
        flow = Flow.from_client_config({'web': client_config} if 'web' not in raw_config and 'installed' not in raw_config else raw_config, scopes=SCOPES, state=state)
    
    base_url = request.host_url.rstrip('/')
    if "onrender.com" in base_url:
        base_url = base_url.replace("http://", "https://")
    flow.redirect_uri = f"{base_url}/oauth2callback"
    
    # PKCE 보안을 위해 code_verifier 복원
    flow.code_verifier = code_verifier

    authorization_response = request.url
    # Render와 같은 프록시 환경에서는 request.url이 http로 올 수 있음 -> https로 강제 변환
    if "onrender.com" in authorization_response:
        authorization_response = authorization_response.replace("http://", "https://")
    
    print(f"DEBUG: Authorization Response URL: {authorization_response}")
    
    try:
        flow.fetch_token(authorization_response=authorization_response)
        print("DEBUG: Token fetched successfully!")
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"DEBUG: Token fetch failed: {error_details}")
        return f"""
        <h2>인증 토큰 획득 실패 (OAuth Error)</h2>
        <p><b>에러 메시지:</b> {str(e)}</p>
        <p><b>상세 디버그 정보:</b></p>
        <pre style="background: #f4f4f4; padding: 10px;">{error_details}</pre>
        <hr>
        <p><b>현재 Redirect URI:</b> {flow.redirect_uri}</p>
        <p><b>받은 응답 URL:</b> {authorization_response}</p>
        """, 500

    credentials = flow.credentials
    session['credentials'] = {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes
    }

    # 인증 완료 후 다시 메인 화면으로 돌아감 (배포 환경 대응)
    return redirect('/')


# 3. 로그아웃 → React 프론트엔드로 리디렉션
@app.route('/api/logout')
def logout():
    if 'credentials' in session:
        session.pop('credentials')
    return redirect('/')


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
#                    정적 파일 및 SPA 라우팅
# ==========================================================

# API 이외의 모든 경로는 React의 index.html을 서빙 (SPA 대응)
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path.startswith('api/') or path == 'authorize' or path == 'oauth2callback':
        return flask.abort(404)
    
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        # 빌드된 파일이 없으면 index.html 반환 (React Router 연동용)
        index_path = os.path.join(app.static_folder, 'index.html')
        abs_static = os.path.abspath(app.static_folder)
        abs_index = os.path.abspath(index_path)
        
        if os.path.exists(index_path):
            return send_from_directory(app.static_folder, 'index.html')
        
        # 디버깅 정보를 HTML로 예쁘게 출력
        error_msg = f"""
        <h2>React 빌드 파일(index.html)을 찾을 수 없습니다.</h2>
        <p><b>찾으려는 절대 경로:</b> {abs_index}</p>
        <p><b>정적 폴더 경로:</b> {abs_static}</p>
        <p><b>현재 서버 위치:</b> {os.path.abspath(app.root_path)}</p>
        <p><b>현재 작업 디렉토리:</b> {os.getcwd()}</p>
        <hr>
        <p>Render 빌드 로그에서 'frontend/dist' 폴더가 정상적으로 생성되었는지 확인해주세요.</p>
        """
        return error_msg, 404

# ==========================================================
#                    서버 실행
# ==========================================================

if __name__ == '__main__':
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
    # 배포 환경에서는 Render가 제공하는 PORT 번호를 사용
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)