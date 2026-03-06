// 스마트 알림(로컬 Notification API) 관련 유틸리티

import { formatYMD } from './dateHelpers';

export function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

export function sendSmartDailyNotification(todos, dDays) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const todayStr = formatYMD(new Date());
    const lastNotiDate = localStorage.getItem('gplanner-last-smart-noti');

    // 하루에 한 번만 알림
    if (lastNotiDate === todayStr) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const msPerDay = 1000 * 60 * 60 * 24;

    // 1. 임박한 D-Day 확인 (내일이 D-Day이거나, D-Day가 3일/7일 남은 경우)
    let dDayMsg = '';
    const upcomingDDays = dDays.filter(d => {
        const targetDate = new Date(d.date);
        targetDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((targetDate - today) / msPerDay);
        return diffDays === 1 || diffDays === 3 || diffDays === 7;
    });

    if (upcomingDDays.length > 0) {
        const closest = upcomingDDays.sort((a, b) => new Date(a.date) - new Date(b.date))[0];
        const targetDate = new Date(closest.date);
        targetDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((targetDate - today) / msPerDay);
        dDayMsg = `🌟 ${closest.title}이(가) ${diffDays}일 남았어요!`;
    }

    // 2. 오늘 마감인 긴급/일반 할 일 확인
    const pendingTodos = todos.filter(t => !t.completed);

    // 마감일이 오늘이거나 지났는데 처리되지 않은 일
    const urgentTodos = pendingTodos.filter(t => {
        if (!t.deadline) return false;
        const deadlineDate = new Date(t.deadline);
        deadlineDate.setHours(0, 0, 0, 0);
        return deadlineDate <= today;
    });

    const highPriorityTodos = pendingTodos.filter(t => t.priority === 'high');

    let todoMsg = '';
    if (urgentTodos.length > 0) {
        todoMsg = `🚨 오늘 마감(또는 지연된) 할 일이 ${urgentTodos.length}개 있어요.`;
    } else if (highPriorityTodos.length > 0) {
        todoMsg = `🔥 우선순위가 높은 할 일이 ${highPriorityTodos.length}개 대기 중입니다.`;
    }

    // 메시지 구성
    if (dDayMsg || todoMsg) {
        const body = [dDayMsg, todoMsg].filter(Boolean).join('\n');
        new Notification('오두막 알림장 📋', {
            body: body,
            icon: '/icon-192x192.png',
            tag: 'daily-smart-noti'
        });
        localStorage.setItem('gplanner-last-smart-noti', todayStr);
    }
}
