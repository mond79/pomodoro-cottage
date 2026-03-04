// Flask 백엔드 API 유틸리티
// 개발 환경(5173 포트)이면 백엔드 주소(5000)를 사용하고, 배포 환경이면 상대 경로를 사용합니다.
const API_BASE = window.location.port === '5173'
    ? 'http://127.0.0.1:5000'
    : ''; // 배포 환경에서는 같은 도메인을 사용하므로 빈 문자열(상대 경로) 사용

/**
 * Flask 서버의 상태를 확인 (구글 로그인 여부)
 */
export async function fetchStatus() {
    try {
        const res = await fetch(`${API_BASE}/api/status`, { credentials: 'include' });
        if (!res.ok) throw new Error('서버 연결 실패');
        return await res.json();
    } catch (err) {
        console.warn('백엔드 서버 연결 불가:', err.message);
        return { is_logged_in: false };
    }
}

/**
 * 구글 캘린더 로그인 페이지로 리디렉트
 */
export function redirectToGoogleLogin() {
    window.location.href = `${API_BASE}/authorize`;
}

/**
 * 구글 캘린더에서 로그아웃
 */
export function redirectToLogout() {
    window.location.href = `${API_BASE}/api/logout`;
}

/**
 * 뽀모도로 완료 시 구글 캘린더에 이벤트 추가
 */
export async function addCalendarEvent(duration, subject = '집중 공부') {
    try {
        const res = await fetch(`${API_BASE}/api/add_event`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ duration, subject }),
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || '이벤트 추가 실패');
        }
        return await res.json();
    } catch (err) {
        console.error('캘린더 이벤트 추가 실패:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * 환경음 목록을 가져오기
 */
export async function fetchAmbientSounds() {
    try {
        const res = await fetch(`${API_BASE}/api/ambient-sounds`, { credentials: 'include' });
        if (!res.ok) throw new Error('환경음 목록 불러오기 실패');
        return await res.json();
    } catch (err) {
        console.warn('환경음 API 연결 불가:', err.message);
        return { sounds: [] };
    }
}

/**
 * 환경음 오디오 파일의 URL을 반환
 */
export function getAudioUrl(filename) {
    return `${API_BASE}/api/audio/${encodeURIComponent(filename)}`;
}

/**
 * Google Tasks 목록 가져오기
 */
export async function fetchTasks() {
    try {
        const res = await fetch(`${API_BASE}/api/tasks`, { credentials: 'include' });
        if (!res.ok) throw new Error('Google Tasks 가져오기 실패');
        return await res.json();
    } catch (err) {
        console.error('Google Tasks fetch failed:', err.message);
        return [];
    }
}

/**
 * Google Tasks 할 일 추가하기
 */
export async function addGoogleTask(title) {
    try {
        const res = await fetch(`${API_BASE}/api/tasks/add`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title }),
        });
        if (!res.ok) throw new Error('할 일 추가 실패');
        return await res.json();
    } catch (err) {
        console.error('Google Tasks add failed:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * 실시간 날씨 정보 가져오기 (OpenWeatherMap via Flask)
 */
export async function fetchWeather(lat, lon) {
    try {
        const res = await fetch(`${API_BASE}/api/weather?lat=${lat}&lon=${lon}`, { credentials: 'include' });
        if (!res.ok) throw new Error('날씨 정보 가져오기 실패');
        return await res.json();
    } catch (err) {
        console.warn('날씨 API 연결 불가:', err.message);
        return null;
    }
}

/**
 * Gemini AI 하루 요약 생성하기
 */
export async function generateDailySummary(data) {
    try {
        const res = await fetch(`${API_BASE}/api/daily-summary`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('AI 요약 생성 실패');
        return await res.json();
    } catch (err) {
        console.error('Daily summary failed:', err.message);
        return { error: err.message };
    }
}
