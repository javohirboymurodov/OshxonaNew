/**
 * Performance Monitoring Utilities for Front Admin
 * Tracks Core Web Vitals, bundle performance, and user interactions
 */

export interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  bundleLoadTime: number;
  routeChangeTime: number;
}

export interface PerformanceEntry {
  name: string;
  value: number;
  timestamp: number;
  type: 'navigation' | 'resource' | 'measure' | 'paint';
}

class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private entries: PerformanceEntry[] = [];
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'development' || 
                     localStorage.getItem('performance-monitoring') === 'true';
    
    if (this.isEnabled) {
      this.init();
    }
  }

  private init() {
    // Track Core Web Vitals
    this.trackCoreWebVitals();
    
    // Track bundle load time
    this.trackBundlePerformance();
    
    // Track route changes
    this.trackRoutePerformance();
    
    // Track memory usage
    this.trackMemoryUsage();
  }

  private trackCoreWebVitals() {
    // First Contentful Paint
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
            this.metrics.fcp = entry.startTime;
            this.addEntry('fcp', entry.startTime, 'paint');
          }
        }
      });
      
      try {
        observer.observe({ entryTypes: ['paint'] });
      } catch (e) {
        console.warn('PerformanceObserver not supported');
      }
    }

    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.lcp = lastEntry.startTime;
        this.addEntry('lcp', lastEntry.startTime, 'measure');
      });
      
      try {
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('LCP observer not supported');
      }
    }
  }

  private trackBundlePerformance() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resource = entry as PerformanceResourceTiming;
            
            // Track JS bundle load time
            if (resource.name.includes('.js') && resource.name.includes('assets/')) {
              this.addEntry(
                `bundle-${resource.name.split('/').pop()}`,
                resource.duration,
                'resource'
              );
            }
          }
        }
      });
      
      try {
        observer.observe({ entryTypes: ['resource'] });
      } catch (e) {
        console.warn('Resource observer not supported');
      }
    }
  }

  private trackRoutePerformance() {
    let routeStartTime = 0;
    
    // Track route start
    window.addEventListener('popstate', () => {
      routeStartTime = performance.now();
    });
    
    // Track route end
    const originalPushState = history.pushState;
    history.pushState = function(...args) {
      routeStartTime = performance.now();
      originalPushState.apply(this, args);
    };
    
    // Measure route change time
    window.addEventListener('load', () => {
      if (routeStartTime > 0) {
        const routeChangeTime = performance.now() - routeStartTime;
        this.metrics.routeChangeTime = routeChangeTime;
        this.addEntry('route-change', routeChangeTime, 'measure');
      }
    });
  }

  private trackMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      
      setInterval(() => {
        this.addEntry('memory-used', memory.usedJSHeapSize, 'measure');
        this.addEntry('memory-total', memory.totalJSHeapSize, 'measure');
      }, 30000); // Every 30 seconds
    }
  }

  private addEntry(name: string, value: number, type: PerformanceEntry['type']) {
    const entry: PerformanceEntry = {
      name,
      value,
      timestamp: Date.now(),
      type
    };
    
    this.entries.push(entry);
    
    // Keep only last 100 entries
    if (this.entries.length > 100) {
      this.entries = this.entries.slice(-100);
    }
    
    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Performance: ${name} = ${value.toFixed(2)}ms`);
    }
  }

  // Public API
  public getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  public getEntries(): PerformanceEntry[] {
    return [...this.entries];
  }

  public measureCustom(name: string, startMark?: string): void {
    if (!this.isEnabled) return;
    
    const endTime = performance.now();
    const startTime = startMark ? 
      performance.getEntriesByName(startMark, 'mark')[0]?.startTime || endTime :
      endTime;
    
    const duration = endTime - startTime;
    this.addEntry(name, duration, 'measure');
  }

  public mark(name: string): void {
    if (!this.isEnabled) return;
    performance.mark(name);
  }

  public reportToConsole(): void {
    if (!this.isEnabled) return;
    
    console.group('🚀 Front Admin Performance Report');
    console.table(this.metrics);
    console.log('Recent entries:', this.entries.slice(-20));
    console.groupEnd();
  }

  public exportData(): string {
    return JSON.stringify({
      metrics: this.metrics,
      entries: this.entries,
      timestamp: Date.now()
    }, null, 2);
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Global performance utilities
export const measurePerformance = (name: string, fn: () => void | Promise<void>) => {
  const startMark = `start-${name}`;
  const endMark = `end-${name}`;
  
  performanceMonitor.mark(startMark);
  
  const result = fn();
  
  if (result instanceof Promise) {
    result.finally(() => {
      performanceMonitor.mark(endMark);
      performanceMonitor.measureCustom(name, startMark);
    });
  } else {
    performanceMonitor.mark(endMark);
    performanceMonitor.measureCustom(name, startMark);
  }
  
  return result;
};

// React component performance wrapper
export const withPerformanceTracking = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  return React.memo((props: P) => {
    React.useEffect(() => {
      performanceMonitor.mark(`component-${componentName}-mount`);
      
      return () => {
        performanceMonitor.mark(`component-${componentName}-unmount`);
      };
    }, []);
    
    return React.createElement(Component, props);
  });
};

// Bundle size analyzer
export const analyzeBundleSize = () => {
  if (!this.isEnabled) return;
  
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const jsBundles = resources.filter(r => r.name.includes('.js') && r.name.includes('assets/'));
  
  console.group('📦 Bundle Size Analysis');
  jsBundles.forEach(bundle => {
    const size = bundle.transferSize || bundle.encodedBodySize || 0;
    console.log(`${bundle.name.split('/').pop()}: ${(size / 1024).toFixed(2)}KB`);
  });
  console.groupEnd();
};

export default performanceMonitor;