import { useState, useEffect } from 'react';

/**
 * 범용 로컬스토리지 훅
 */
export function useLocalStorage(key, initialValue) {
    const [value, setValue] = useState(() => {
        try {
            const raw = localStorage.getItem(key);
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.error('로컬스토리지 로드 에러:', e);
        }
        // 초기값이 함수라면 실행해서 리턴, 아니면 그대로 리턴
        return initialValue instanceof Function ? initialValue() : initialValue;
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('로컬스토리지 저장 에러:', e);
        }
    }, [key, value]);

    return [value, setValue];
}
