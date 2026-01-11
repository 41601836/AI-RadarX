import { useEffect, useRef, useState } from 'react';

/**
 * 元素可见性检测钩子
 * @param options IntersectionObserver选项
 * @returns [ref, isVisible] 元素引用和可见性状态
 */
export const useVisibilityObserver = (
  options: IntersectionObserverInit = { threshold: 0.1 }
) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true); // 默认可见，避免初始闪烁

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        setIsVisible(entry.isIntersecting);
      });
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [options]);

  return [ref, isVisible] as const;
};
