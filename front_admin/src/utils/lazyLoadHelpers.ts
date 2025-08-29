/**
 * Utilities for lazy loading and performance optimization
 */

interface ImageLazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
}

/**
 * Lazy load images using Intersection Observer
 */
export class ImageLazyLoader {
  private observer: IntersectionObserver;
  private images: Set<HTMLImageElement> = new Set();

  constructor(options: ImageLazyLoadOptions = {}) {
    const { threshold = 0.1, rootMargin = '50px' } = options;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            this.loadImage(img);
          }
        });
      },
      { threshold, rootMargin }
    );
  }

  observe(img: HTMLImageElement) {
    if (img.dataset.src) {
      this.images.add(img);
      this.observer.observe(img);
    }
  }

  unobserve(img: HTMLImageElement) {
    this.images.delete(img);
    this.observer.unobserve(img);
  }

  private loadImage(img: HTMLImageElement) {
    const src = img.dataset.src;
    if (src) {
      img.src = src;
      img.removeAttribute('data-src');
      img.classList.add('loaded');
      this.unobserve(img);
    }
  }

  disconnect() {
    this.observer.disconnect();
    this.images.clear();
  }
}

/**
 * Debounce function for search and API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Throttle function for scroll events
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Intersection Observer hook for lazy loading components
 */
export function createIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver {
  const defaultOptions = {
    threshold: 0.1,
    rootMargin: '50px',
    ...options,
  };

  return new IntersectionObserver(callback, defaultOptions);
}

/**
 * Preload critical resources
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Check if element is in viewport
 */
export function isElementInViewport(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Virtual scrolling utilities
 */
export interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  totalItems: number;
  overscan?: number;
}

export function calculateVirtualScrollRange(
  scrollTop: number,
  config: VirtualScrollConfig
) {
  const { itemHeight, containerHeight, totalItems, overscan = 5 } = config;
  
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    totalItems - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight)
  );
  
  const start = Math.max(0, visibleStart - overscan);
  const end = Math.min(totalItems - 1, visibleEnd + overscan);
  
  return { start, end, visibleStart, visibleEnd };
}

/**
 * Lazy component loader with retry mechanism
 */
export function createLazyComponent<T>(
  importFn: () => Promise<{ default: T }>,
  retries = 3
) {
  return async (): Promise<{ default: T }> => {
    let lastError: Error;
    
    for (let i = 0; i < retries; i++) {
      try {
        return await importFn();
      } catch (error) {
        lastError = error as Error;
        
        // Wait before retry (exponential backoff)
        if (i < retries - 1) {
          await new Promise(resolve => 
            setTimeout(resolve, Math.pow(2, i) * 1000)
          );
        }
      }
    }
    
    throw lastError!;
  };
}

/**
 * Memory usage monitoring for development
 */
export function logMemoryUsage(label: string) {
  if (process.env.NODE_ENV === 'development' && 'performance' in window) {
    const memory = (performance as any).memory;
    if (memory) {
      console.log(`[Memory ${label}]`, {
        used: `${Math.round(memory.usedJSHeapSize / 1048576)} MB`,
        total: `${Math.round(memory.totalJSHeapSize / 1048576)} MB`,
        limit: `${Math.round(memory.jsHeapSizeLimit / 1048576)} MB`,
      });
    }
  }
}