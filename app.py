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
import requests
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

OPENWEATHER_API_KEY = os.environ.get('OPENWEATHER_WEATHER_API_KEY') or os.environ.get('OPENWEATHER_API_KEY')

# 배포 환경에서 http 요청을 허용 (Render의 프록시 내부 통신 대응)
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

app = Flask(__name__)
# 세션 유실 방지를 위해 고정 키 사용
app.secret_key = 'mond_cottage_development_key'

# 세션 쿠키 설정 (크로스 오리진 및 배포 환경 대응)
is_prod = os.environ.get('RENDER') == 'true' or 'onrender.com' in os.environ.get('FRONTEND_URL', '')
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

SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/tasks'
]
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

@app.route('/api/weather')
def get_weather():
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    
    if not lat or not lon:
        return jsonify({'error': 'Location (lat/lon) is required'}), 400
    
    if not OPENWEATHER_API_KEY:
        return jsonify({'error': 'Weather API Key is not configured'}), 500
        
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric&lang=kr"
        response = requests.get(url)
        data = response.json()
        
        if response.status_code == 200:
            return jsonify({
                'temp': data['main']['temp'],
                'condition': data['weather'][0]['main'],
                'description': data['weather'][0]['description'],
                'icon': data['weather'][0]['icon'],
                'city': data['name']
            })
        else:
            return jsonify({'error': data.get('message', 'Failed to fetch weather')}), response.status_code
            
    except Exception as e:
        print(f"DEBUG: Weather API failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

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

    # 인증 완료 후 다시 메인 화면으로 돌아감
    if is_prod:
        target_url = '/'
    else:
        target_url = 'http://127.0.0.1:5173'
        
    print(f"DEBUG: Redirecting definitively to {target_url} (is_prod was {is_prod})")
    return redirect(target_url)

# 3. 로그아웃 → 프론트엔드로 리디렉션
@app.route('/api/logout')
def logout():
    if 'credentials' in session:
        session.pop('credentials')
    
    if is_prod:
        target_url = '/'
    else:
        target_url = 'http://127.0.0.1:5173'
        
    return redirect(target_url)

# --- Google Tasks API 연동 ---

def get_credentials():
    if 'credentials' not in session:
        return None
    return Credentials(**session['credentials'])

@app.route('/api/tasks')
def get_tasks():
    creds = get_credentials()
    if not creds:
        return jsonify([])
    
    try:
        service = build('tasks', 'v1', credentials=creds)
        
        # 기본 할 일 목록(My Tasks) 가져오기
        tasklists = service.tasklists().list().execute()
        if not tasklists.get('items'):
            return jsonify([])
            
        first_list_id = tasklists['items'][0]['id']
        
        tasks_result = service.tasks().list(tasklist=first_list_id).execute()
        tasks = tasks_result.get('items', [])
        
        # 필요한 정보만 가공해서 반환
        return jsonify([{
            'id': t['id'],
            'text': t['title'],
            'completed': t['status'] == 'completed',
            'source': 'google'
        } for t in tasks])
    except Exception as e:
        print(f"DEBUG: Tasks fetch failed: {str(e)}")
        return jsonify([])

@app.route('/api/tasks/add', methods=['POST'])
def add_task():
    creds = get_credentials()
    if not creds:
        return jsonify({'success': False, 'error': 'Not logged in'})
    
    data = request.json
    title = data.get('title')
    
    try:
        service = build('tasks', 'v1', credentials=creds)
        
        tasklists = service.tasklists().list().execute()
        if not tasklists.get('items'):
            return jsonify({'success': False, 'error': 'No tasklist found'})
            
        first_list_id = tasklists['items'][0]['id']
        
        task = {
            'title': title
        }
        result = service.tasks().insert(tasklist=first_list_id, body=task).execute()
        return jsonify({'success': True, 'id': result['id']})
    except Exception as e:
        print(f"DEBUG: Task add failed: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})


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

# 1. 정적 파일(JS, CSS, 이미지, PWA 워커 등) 서빙
@app.route('/<path:filename>')
def serve_static(filename):
    # 루트에 있는 파일들 (vite.svg, sw.js, manifest.webmanifest 등) 우선 확인
    if os.path.exists(os.path.join(app.static_folder, filename)):
        return send_from_directory(app.static_folder, filename)
    flask.abort(404)

# 2. SPA 대응: 모든 404 에러 시 index.html 반환 (API 제외)
@app.errorhandler(404)
def not_found(e):
    # API 요청이나 Auth 경로는 에러 처리를 그대로 진행
    if request.path.startswith('/api/') or request.path == '/authorize' or request.path == '/oauth2callback':
        return e
    
    # 그 외의 경우 React의 index.html 반환 시도
    index_path = os.path.join(app.static_folder, 'index.html')
    if os.path.exists(index_path):
        return send_from_directory(app.static_folder, 'index.html')
    
    # 빌드 파일이 없을 경우 디버깅 메시지 출력
    abs_static = os.path.abspath(app.static_folder)
    abs_index = os.path.abspath(index_path)
    error_msg = f"""
    <h2>React 빌드 파일(index.html)을 찾을 수 없습니다.</h2>
    <p><b>현재 요청 경로:</b> {request.path}</p>
    <p><b>찾으려는 절대 경로:</b> {abs_index}</p>
    <p><b>정적 폴더 경로:</b> {abs_static}</p>
    <hr>
    <p>로컬 개발 시에는 <b>http://127.0.0.1:5173</b> 사이트로 접속해주세요!</p>
    """
    return error_msg, 404

# ==========================================================
#         📝 Gemini AI 하루 요약 (gemini-3.1-flash-lite)
# ==========================================================

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')

@app.route('/api/daily-summary', methods=['POST'])
def daily_summary():
    """오늘의 공부 데이터를 기반으로 Gemini AI가 따뜻한 하루 요약을 생성합니다."""
    if not GEMINI_API_KEY:
        return jsonify({'error': 'GEMINI_API_KEY가 설정되지 않았습니다.'}), 500

    try:
        data = request.json or {}
        tomatoes = data.get('tomatoes', 0)
        sessions = data.get('sessions', [])
        todos = data.get('todos', [])
        mood = data.get('mood', '클래식')
        weather = data.get('weather', '')
        diary = data.get('diary', '')

        # 세션 요약 생성
        session_text = ''
        if sessions:
            subjects = {}
            for s in sessions:
                name = s.get('subjectName', '공부')
                subjects[name] = subjects.get(name, 0) + 1
            session_text = ', '.join([f'{name} {count}회' for name, count in subjects.items()])

        # 할 일 요약
        completed_todos = [t['text'] for t in todos if t.get('completed')]
        pending_todos = [t['text'] for t in todos if not t.get('completed')]

        prompt = f"""당신은 따뜻하고 감성적인 오두막 주인입니다. 사용자의 하루 공부 데이터를 보고, 
짧지만 마음이 따뜻해지는 한국어 일기체 요약을 3~4문장으로 작성해주세요.
과하게 칭찬하지 말고, 자연스럽고 진심 어린 톤으로 써주세요.
이모지를 적절히 1~2개 사용해주세요.

오늘의 데이터:
- 수확한 토마토: {tomatoes}개
- 공부 내용: {session_text or '기록 없음'}
- 완료한 할 일: {', '.join(completed_todos) if completed_todos else '없음'}
- 남은 할 일: {', '.join(pending_todos) if pending_todos else '없음'}
- 오두막 테마: {mood}
- 날씨: {weather or '정보 없음'}
- 사용자가 쓴 일기: {diary or '아직 안 씀'}

위 데이터를 바탕으로 따뜻한 하루 요약을 써주세요. 반드시 한국어로만 작성하세요."""

        # Gemini API 호출 (gemini-3.1-flash-lite-preview)
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key={GEMINI_API_KEY}"
        
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.8,
                "maxOutputTokens": 256
            }
        }

        resp = requests.post(api_url, json=payload, timeout=15)
        
        if resp.status_code != 200:
            print(f"Gemini API error: {resp.status_code} - {resp.text}")
            return jsonify({'error': f'Gemini API 오류: {resp.status_code}'}), 500

        result = resp.json()
        summary_text = result.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')

        if not summary_text:
            return jsonify({'error': '요약 생성에 실패했습니다.'}), 500

        return jsonify({'summary': summary_text.strip()})

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ==========================================================
#                    서버 실행
# ==========================================================

if __name__ == '__main__':
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
    # 배포 환경에서는 Render가 제공하는 PORT 번호를 사용
    port = int(os.environ.get("PORT", 5000))
    # 로컬 개발 시에는 debug=True로 자동 재로딩 활성화
    app.run(host='0.0.0.0', port=port, debug=True)