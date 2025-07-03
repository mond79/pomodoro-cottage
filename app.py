# app.py (PWA 기능이 추가된 최종 버전)

# 1. send_from_directory를 꼭 추가해줘!
from flask import Flask, render_template, send_from_directory
import os

app = Flask(__name__)

# 기존 경로 설정
AMBIENT_DIR = os.path.join(app.root_path, 'static', 'sounds', 'ambient')

# 메인 페이지 라우트
@app.route('/')
def index():
    ambient_files = []
    if os.path.exists(AMBIENT_DIR):
        for filename in os.listdir(AMBIENT_DIR):
            if filename.endswith(('.mp3', '.wav')):
                ambient_files.append(filename)
    return render_template('index.html', ambient_files=ambient_files)


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


# 3. 서버 실행 코드
if __name__ == '__main__':
    # debug=False로 변경하고, host와 port를 지정해주는 것이 좋음
    # (하지만 Render는 이 부분을 사용하지 않으므로, 크게 중요하지는 않아)
    app.run(host='0.0.0.0', port=5000, debug=False)