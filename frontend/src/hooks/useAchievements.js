import { useState, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { ACHIEVEMENTS } from '../constants';

export default function useAchievements(pomoSessions, totalHarvest) {
    // 획득한 배지 ID 목록 저장
    const [achievements, setAchievements] = useLocalStorage('gplanner-achievements', []);
    // 화면에 띄워줄 방금 획득한 새 배지
    const [newUnlocked, setNewUnlocked] = useState(null); 

    useEffect(() => {
        if (!pomoSessions || pomoSessions.length === 0) return;

        let unlockedThisTime = null;
        let newAchievements = [...achievements];

        ACHIEVEMENTS.forEach(badge => {
            if (newAchievements.includes(badge.id)) return; // 이미 획득한 배지는 넘김

            let isUnlocked = false;

            if (badge.type === 'total') {
                if (totalHarvest >= badge.threshold) isUnlocked = true;
            } else if (badge.type === 'special_time_night') {
                // 밤 11시(23) ~ 새벽 4시 사이 완료된 세션 (pomoSessions.endTime 활용)
                const count = pomoSessions.filter(s => {
                    const hour = new Date(s.endTime || new Date()).getHours();
                    return hour >= 23 || hour < 4;
                }).length;
                if (count >= badge.threshold) isUnlocked = true;
            } else if (badge.type === 'special_time_morning') {
                // 새벽 4시 ~ 아침 8시 사이 완료 세션
                const count = pomoSessions.filter(s => {
                    const hour = new Date(s.endTime || new Date()).getHours();
                    return hour >= 4 && hour < 8;
                }).length;
                if (count >= badge.threshold) isUnlocked = true;
            } else if (badge.type === 'daily_peak') {
                // 하루 최대 토마토 수확량 검사
                const dailyCounts = {};
                pomoSessions.forEach(s => {
                    dailyCounts[s.date] = (dailyCounts[s.date] || 0) + 1;
                });
                const maxDaily = Math.max(0, ...Object.values(dailyCounts));
                if (maxDaily >= badge.threshold) isUnlocked = true;
            }

            if (isUnlocked) {
                newAchievements.push(badge.id);
                // 가장 마지막에 달성한 배지 1개를 알림용으로 등록 (동시 달성 시 1개만 주로 노출)
                unlockedThisTime = badge; 
            }
        });

        // 새로운 배지를 획득했다면
        if (unlockedThisTime) {
            setAchievements(newAchievements);
            setNewUnlocked(unlockedThisTime);
            
            // 4초 후 알림 제거
            const timer = setTimeout(() => {
                setNewUnlocked(null);
            }, 4000);
            return () => clearTimeout(timer);
        }

    }, [pomoSessions, totalHarvest, achievements, setAchievements]);

    return { achievements, newUnlocked };
}
