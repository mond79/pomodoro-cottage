import os
import flask
from flask import Flask, render_template, send_from_directory, session, redirect, url_for, request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from datetime import datetime, timedelta

app = Flask(__name__)
# 세션을 사용하려면, 아무도 모르는 '비밀 키'가 꼭 필요해!
# 이건 서버를 껐다 켤 때마다 바뀌어도 상관없어.
app.secret_key = os.urandom(24)

# 우리가 만든 구글 사업자 등록증 파일의 위치
CLIENT_SECRETS_FILE = 'client_secret.json'
# 우리가 구글에게 요청할 업무 범위 (캘린더를 읽고 쓸 수 있는 권한)
SCOPES = ['https://www.googleapis.com/auth/calendar.events']

# --- 기존 경로 설정 ---
AMBIENT_DIR = os.path.join(app.root_path, 'static', 'sounds', 'ambient')

# 메인 페이지 라우트
@app.route('/')
def index():
    ambient_files = []
    if os.path.exists(AMBIENT_DIR):
        for filename in os.listdir(AMBIENT_DIR):
            if filename.endswith(('.mp3', '.wav')):
                ambient_files.append(filename)
    
    # ⭐ 추가: 사용자가 로그인했는지 확인해서, HTML로 전달
    is_logged_in = 'credentials' in session
    return render_template('index.html', ambient_files=ambient_files, is_logged_in=is_logged_in)


# 2. PWA를 위한 새로운 주소(라우트) 2개 추가!
@app.route('/manifest.json')
def manifest():
    # 프로젝트 최상위 폴더에서 manifest.json을 찾아서 보내줌
    return send_from_directory(app.root_path, 'manifest.json')

@app.route('/service-worker.js')
def service_worker():
    # 프로젝트 최상위 폴더에서 service-worker.js를 찾아서 보내줌
    response = send_from_directory(app.root_path, 'service-worker.js')
    response.headers['Content-Type'] = 'application/javascript'
    return response

# ==========================================================
#         ⭐ 구글 캘린더 연동을 위한 새로운 라우트들 ⭐
# ==========================================================

# 1. "구글 캘린더 연동하기" 버튼을 누르면, 여기가 시작이야!
@app.route('/authorize')
def authorize():
    # 구글 플로우(Flow) 객체 생성
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE, scopes=SCOPES)
    # 우리 앱의 어떤 주소로 다시 돌아와야 하는지 알려줌
    flow.redirect_uri = url_for('oauth2callback', _external=True)
    # 구글 로그인 페이지로 가는 URL을 생성
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true')
    # 나중에 다시 돌아왔을 때, 위조된 요청이 아닌지 확인하기 위해 state 저장
    session['state'] = state
    # 생성된 구글 로그인 페이지로 사용자를 보냄
    return redirect(authorization_url)


# 2. 구글에서 신분증 검사를 마치고 돌아오는 주소
@app.route('/oauth2callback')
def oauth2callback():
    # 위조 방지 체크
    state = session['state']
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE, scopes=SCOPES, state=state)
    flow.redirect_uri = url_for('oauth2callback', _external=True)

    # 구글이 보내준 '임시 출입증(인증 코드)'을 받음
    authorization_response = request.url
    # 임시 출입증을 진짜 '단골 카드(토큰)'로 교환
    flow.fetch_token(authorization_response=authorization_response)

    # 발급받은 '단골 카드'를 안전하게 저장
    credentials = flow.credentials
    session['credentials'] = {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes}
    
    # 모든 과정이 끝났으니, 다시 메인 페이지로 돌아감
    return redirect(url_for('index'))


# 3. 로그아웃 기능
@app.route('/logout')
def logout():
    # 세션에서 '단골 카드' 정보 삭제
    if 'credentials' in session:
        session.pop('credentials')
    return redirect(url_for('index'))


# 4. 뽀모도로 완료 시, 캘린더에 이벤트를 생성하는 주소
@app.route('/add_event', methods=['POST'])
def add_event():
    # 사용자가 로그인하지 않았으면, 아무것도 안 함
    if 'credentials' not in session:
        return flask.jsonify({'error': 'User not authenticated'}), 401

    # 저장된 '단골 카드' 정보로 구글 인증 정보 객체 생성
    credentials = Credentials(**session['credentials'])
    # 캘린더 업무를 할 수 있는 '서비스 객체' 생성
    service = build('calendar', 'v3', credentials=credentials)

    # 뽀모도로 세션 정보 (시작 시간, 종료 시간)
    now = datetime.utcnow()
    # 자바스크립트에서 보낸 'duration' 값을 받음
    duration = request.json.get('duration', 25)
    start_time = (now - timedelta(minutes=duration)).isoformat() + 'Z' # UTC
    end_time = now.isoformat() + 'Z' # UTC

    # 구글 캘린더에 보낼 '주문서(이벤트 객체)' 작성
    event = {
      'summary': '✅ 집중 시간 완료 (코티지 뽀모도로)',
      'description': '몬드의 코티지 뽀모도로 앱으로 집중한 시간입니다.',
      'start': {
        'dateTime': start_time,
        'timeZone': 'UTC',
      },
      'end': {
        'dateTime': end_time,
        'timeZone': 'UTC',
      },
    }

    # 구글 캘린더에 이벤트 생성 요청!
    service.events().insert(calendarId='primary', body=event).execute()
    
    # 성공적으로 완료되었다고 응답
    return flask.jsonify({'success': True})


# --- 서버 실행 코드 ---
if __name__ == '__main__':
    # SSL/TLS를 사용하지 않을 경우, OAuth 리디렉션 URI에 HTTP를 허용해야 함
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
    app.run(host='0.0.0.0', port=5000, debug=True)