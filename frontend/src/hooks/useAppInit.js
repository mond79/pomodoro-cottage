import { useEffect } from 'react';
import { fetchStatus, fetchTasks, fetchCalendarEvents } from '../utils/api';
import { formatYMD } from '../utils/dateHelpers';
import { loadStoredPlaylist } from '../utils/playlistStore';
import { sendSmartDailyNotification } from '../utils/notifications';

export default function useAppInit({
    lastActiveDate, setLastActiveDate,
    setTodos, todos,
    setIsGoogleLoggedIn,
    setPlaylist, setCurrentTrackIdx,
    dDays,
    events, setEvents
}) {
    useEffect(() => {
        // 1. 날짜 변경 감지 로직 (자정이 지났으면 할 일 비우기)
        const todayStr = formatYMD(new Date());
        if (lastActiveDate !== todayStr) {
            console.log('🌅 새로운 날이 밝았습니다! 할 일 목록을 정리합니다.');
            setTodos([]);
            setLastActiveDate(todayStr); // 오늘 날짜로 갱신
        }

        // 2. 백엔드 상태 확인 및 초기 데이터 로드 (Google 로그인 상태 등)
        fetchStatus().then(data => {
            setIsGoogleLoggedIn(data.is_logged_in);

            // 구글 로그인 상태라면 할 일 목록 및 캘린더 일정 가져오기
            if (data.is_logged_in) {
                // 1) 할 일 목록 가져오기
                fetchTasks().then(googleTasks => {
                    if (googleTasks && googleTasks.length > 0) {
                        setTodos(prev => {
                            // 중복 방지 (텍스트 기준)
                            const existingTexts = new Set(prev.map(t => t.text));
                            const newTasksFromGoogle = googleTasks.filter(gt => !existingTexts.has(gt.text));
                            return [...prev, ...newTasksFromGoogle];
                        });
                    }
                });

                // 2) 캘린더 일정 가져오기
                fetchCalendarEvents().then(fetchedEvents => {
                    if (fetchedEvents && fetchedEvents.length > 0) {
                        setEvents(prev => {
                            // 기존의 구글 동기화 이벤트는 지우고 새로운 이벤트로 덮어쓰기
                            const localOnly = prev.filter(e => e.source !== 'google');
                            return [...localOnly, ...fetchedEvents];
                        });
                    }
                });
            }
        });

        // 3. IndexedDB에서 저장된 플레이리스트 로드
        loadStoredPlaylist().then(stored => {
            if (stored && stored.length > 0) {
                const withUrls = stored.map(track => ({
                    ...track,
                    url: URL.createObjectURL(track.blob)
                }));
                setPlaylist(withUrls);
                setCurrentTrackIdx(0);
            }
        });

        // 4. 🔔 브라우저 알림 권한 획득 & 스마트 알림 전송
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        sendSmartDailyNotification(todos, dDays);
                    }
                });
            } else if (Notification.permission === 'granted') {
                sendSmartDailyNotification(todos, dDays);
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastActiveDate, setLastActiveDate, setTodos]); // dDays, todos는 매번 실행되지 않도록 초기 로드에만 종속
}
