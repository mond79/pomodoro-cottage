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

# 세션 쿠키 설정 (크로스 오리진 및 배포 환경 구글 OAuth 대응)
is_prod = os.environ.get('RENDER') == 'true' or 'onrender.com' in os.environ.get('FRONTEND_URL', '')
app.config.update(
    # 구글 외부 서버 리디렉트 간 쿠키 유실(403 CSRF/State 오류) 방지를 위해 SameSite='None' 필요
    SESSION_COOKIE_SAMESITE='None' if is_prod else 'Lax',
    SESSION_COOKIE_HTTPONLY=True,
    # Samesite=None을 쓰려면 SECURE=True가 필수이므로 배포 환경에선 반드시 True여야 함
    SESSION_COOKIE_SECURE=is_prod,  
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


# 5. 커스텀 일정 구글 캘린더에 추가 (시간, 장소 포함)
@app.route('/api/calendar/events', methods=['POST'])
def add_custom_event():
    if 'credentials' not in session:
        return jsonify({'error': '구글 계정으로 로그인해주세요.'}), 401

    credentials = Credentials(**session['credentials'])
    service = build('calendar', 'v3', credentials=credentials)

    data = request.json
    title = data.get('title', '새로운 일정')
    start_time = data.get('start_time')
    end_time = data.get('end_time')
    location = data.get('location', '')

    if not start_time or not end_time:
        return jsonify({'error': '시작 시간과 종료 시간이 필요합니다.'}), 400

    event = {
        'summary': title,
        'description': 'Gonggong Planner 오두막에서 등록된 일정입니다. 🏡',
        'location': location,
        'start': {'dateTime': start_time, 'timeZone': 'Asia/Seoul'},
        'end': {'dateTime': end_time, 'timeZone': 'Asia/Seoul'},
    }

    try:
        inserted_event = service.events().insert(calendarId='primary', body=event).execute()
        return jsonify({'success': True, 'eventId': inserted_event.get('id')})
    except Exception as e:
        print(f"DEBUG: Custom event add failed: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# 6. 구글 캘린더에서 일정(기본 캘린더 + 생일 캘린더) 가져오기
@app.route('/api/calendar/events', methods=['GET'])
def get_calendar_events():
    if 'credentials' not in session:
        return jsonify([])

    credentials = Credentials(**session['credentials'])
    service = build('calendar', 'v3', credentials=credentials)
    
    now = datetime.utcnow()
    # 최근 1개월 ~ 향후 2개월 이벤트 로드
    time_min = (now - timedelta(days=30)).isoformat() + 'Z'
    time_max = (now + timedelta(days=60)).isoformat() + 'Z'
    
    all_events = []
    
    # [A] 기본 캘린더(Primary) 패치
    try:
        events_result = service.events().list(
            calendarId='primary', 
            timeMin=time_min, 
            timeMax=time_max,
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        for item in events_result.get('items', []):
            item['calendarSource'] = 'primary'
            all_events.append(item)
    except Exception as e:
        print(f"DEBUG: Primary calendar fetch failed: {str(e)}")

    # [B] 생일 캘린더(Birthdays) 패치
    try:
        birthday_result = service.events().list(
            calendarId='addressbook#contacts@group.v.calendar.google.com', 
            timeMin=time_min, 
            timeMax=time_max,
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        for item in birthday_result.get('items', []):
            item['calendarSource'] = 'birthdays'
            all_events.append(item)
    except Exception as e:
        print(f"DEBUG: Birthdays calendar fetch failed: {str(e)}")
        
    formatted_events = []
    for e in all_events:
        start = e.get('start', {})
        start_dt = start.get('dateTime') or start.get('date')
        if not start_dt: continue
        
        date_str = start_dt[:10]
        time_str = ''
        if 'T' in start_dt:
            time_str = start_dt[11:16]
            
        formatted_events.append({
            'id': e['id'],
            'title': e.get('summary', '제목 없음'),
            'date': date_str,
            'time': time_str,
            'location': e.get('location', ''),
            'category': 'birthday' if e.get('calendarSource') == 'birthdays' else 'google',
            'source': 'google',
            'eventId': e['id']
        })
        
    return jsonify(formatted_events)

# 7. 구글 캘린더에서 특정 이벤트 삭제
@app.route('/api/calendar/events/<event_id>', methods=['DELETE'])
def delete_calendar_event(event_id):
    if 'credentials' not in session:
        return jsonify({'error': '구글 계정으로 로그인해주세요.'}), 401

    credentials = Credentials(**session['credentials'])
    service = build('calendar', 'v3', credentials=credentials)
    
    try:
        service.events().delete(calendarId='primary', eventId=event_id).execute()
        return jsonify({'success': True})
    except Exception as e:
        print(f"DEBUG: Event delete failed: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

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
#    📊 정원 앨범 - 집중 통계 & AI 리포트
# ==========================================================

@app.route('/api/focus-stats', methods=['POST'])
def focus_stats():
    """pomoSessions 데이터를 분석하여 통계 + Gemini AI 리포트를 생성합니다."""
    try:
        data = request.json or {}
        sessions = data.get('sessions', [])

        if not sessions:
            return jsonify({
                'stats': {},
                'aiReport': '아직 기록된 뽀모도로 세션이 없어요. 첫 번째 토마토를 수확해 보세요! 🍅'
            })

        from collections import Counter
        from datetime import datetime

        # --- 1. 요일별 집중 횟수 ---
        day_names = ['월', '화', '수', '목', '금', '토', '일']
        day_counter = Counter()
        for s in sessions:
            try:
                dt = datetime.strptime(s.get('date', ''), '%Y-%m-%d')
                day_counter[day_names[dt.weekday()]] += 1
            except (ValueError, IndexError):
                pass

        day_stats = {d: day_counter.get(d, 0) for d in day_names}

        # --- 2. 시간대별 집중 분포 ---
        time_slots = {'아침(6-12)': 0, '오후(12-18)': 0, '저녁(18-22)': 0, '밤(22-6)': 0}
        for s in sessions:
            try:
                hour = int(s.get('startTime', '12:00').split(':')[0])
                if 6 <= hour < 12:
                    time_slots['아침(6-12)'] += 1
                elif 12 <= hour < 18:
                    time_slots['오후(12-18)'] += 1
                elif 18 <= hour < 22:
                    time_slots['저녁(18-22)'] += 1
                else:
                    time_slots['밤(22-6)'] += 1
            except (ValueError, IndexError):
                time_slots['오후(12-18)'] += 1

        # --- 3. 과목별 누적 세션 수 ---
        subject_counter = Counter()
        for s in sessions:
            name = s.get('subjectName', '자유 집중')
            subject_counter[name] += 1

        subject_stats = dict(subject_counter.most_common(10))

        # --- 4. 핵심 지표 계산 ---
        best_day = max(day_stats, key=day_stats.get) if day_stats else '없음'
        best_time = max(time_slots, key=time_slots.get) if time_slots else '없음'
        total_sessions = len(sessions)

        # 주간 평균 (최근 30일 기준)
        unique_dates = set(s.get('date', '') for s in sessions if s.get('date'))
        active_days = len(unique_dates) or 1
        weekly_avg = round(total_sessions / max(active_days / 7, 1), 1)

        # 최근 7일 트렌드
        from datetime import timedelta
        today = datetime.now().date()
        recent_7 = []
        for i in range(6, -1, -1):
            d = today - timedelta(days=i)
            d_str = d.strftime('%Y-%m-%d')
            count = sum(1 for s in sessions if s.get('date') == d_str)
            recent_7.append({'date': d_str, 'label': f'{d.month}/{d.day}', 'count': count})

        # 최근 30일 트렌드 (주 단위 집계)
        recent_30_weeks = []
        for w in range(3, -1, -1):
            week_start = today - timedelta(days=(w + 1) * 7 - 1)
            week_end = today - timedelta(days=w * 7)
            count = sum(1 for s in sessions
                        if s.get('date') and week_start <= datetime.strptime(s['date'], '%Y-%m-%d').date() <= week_end)
            recent_30_weeks.append({
                'label': f'{week_start.month}/{week_start.day}~{week_end.month}/{week_end.day}',
                'count': count
            })

        stats = {
            'totalSessions': total_sessions,
            'activeDays': active_days,
            'weeklyAvg': weekly_avg,
            'bestDay': best_day,
            'bestTime': best_time,
            'dayStats': day_stats,
            'timeSlots': time_slots,
            'subjectStats': subject_stats,
            'recent7': recent_7,
            'recent30Weeks': recent_30_weeks,
        }

        # --- 5. Gemini AI 리포트 생성 ---
        ai_report = ''
        if GEMINI_API_KEY:
            stats_text = f"""총 세션: {total_sessions}회, 활동 일수: {active_days}일, 주간 평균: {weekly_avg}회
최다 집중 요일: {best_day} ({day_stats.get(best_day, 0)}회)
최다 집중 시간대: {best_time} ({time_slots.get(best_time, 0)}회)
과목별: {', '.join([f'{k} {v}회' for k, v in subject_stats.items()])}"""

            prompt = f"""당신은 따뜻하고 감성적인 오두막의 정원사입니다. 
사용자의 집중 통계 데이터를 보고, 짧지만 마음이 따뜻해지는 한국어 분석 리포트를 4~5문장으로 작성해 주세요.
구체적인 수치를 언급하며 칭찬하되, 과하지 않게 자연스럽고 진심 어린 톤으로 써주세요.
이모지를 적절히 2~3개 사용해 주세요.

집중 통계 데이터:
{stats_text}

위 데이터를 바탕으로 따뜻한 집중 분석 리포트를 써주세요. 반드시 한국어로만 작성하세요."""

            try:
                api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key={GEMINI_API_KEY}"
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.8, "maxOutputTokens": 300}
                }
                resp = requests.post(api_url, json=payload, timeout=15)
                if resp.status_code == 200:
                    result = resp.json()
                    ai_report = result.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
                else:
                    print(f"Focus stats Gemini error: {resp.status_code}")
            except Exception as gem_err:
                print(f"Gemini API call failed: {gem_err}")

        if not ai_report:
            ai_report = f"지금까지 총 {total_sessions}개의 토마토를 수확하셨어요! {best_day}요일 {best_time}에 가장 집중을 잘하시는군요. 꾸준히 정원을 가꿔 나가고 계시네요 🌱"

        return jsonify({'stats': stats, 'aiReport': ai_report.strip()})

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