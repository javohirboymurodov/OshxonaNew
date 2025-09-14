import React, { useState, useCallback, memo } from 'react';
import { Image, Skeleton } from 'antd';
import { performanceMonitor } from '@/utils/performance';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  placeholder?: React.ReactNode;
  fallback?: string;
  loading?: 'lazy' | 'eager';
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'auto';
  blurDataURL?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

/**
 * Optimized Image component with lazy loading, format optimization, and performance tracking
 */
const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  width,
  height,
  placeholder,
  fallback = '/placeholder-image.png',
  loading = 'lazy',
  quality = 80,
  format = 'auto',
  blurDataURL,
  className,
  style,
  onClick
}: OptimizedImageProps) {
  const [imageState, setImageState] = useState<{
    loaded: boolean;
    error: boolean;
    loading: boolean;
  }>({
    loaded: false,
    error: false,
    loading: true
  });

  const [imageSrc, setImageSrc] = useState<string>(() => {
    // Generate optimized image URL
    return generateOptimizedImageUrl(src, { width, height, quality, format });
  });

  const handleLoad = useCallback(() => {
    performanceMonitor.mark(`image-load-${src}`);
    performanceMonitor.measureCustom(`image-load-${src}`, `image-load-${src}`);
    
    setImageState({
      loaded: true,
      error: false,
      loading: false
    });
  }, [src]);

  const handleError = useCallback(() => {
    performanceMonitor.mark(`image-error-${src}`);
    
    setImageState({
      loaded: false,
      error: true,
      loading: false
    });
    
    // Try fallback image
    if (fallback && imageSrc !== fallback) {
      setImageSrc(fallback);
    }
  }, [src, fallback, imageSrc]);

  const handleClick = useCallback(() => {
    performanceMonitor.mark(`image-click-${src}`);
    onClick?.();
  }, [src, onClick]);

  // Generate optimized image URL based on parameters
  function generateOptimizedImageUrl(
    originalSrc: string,
    options: {
      width?: number | string;
      height?: number | string;
      quality?: number;
      format?: string;
    }
  ): string {
    // If it's a data URL or external URL, return as is
    if (originalSrc.startsWith('data:') || originalSrc.startsWith('http')) {
      return originalSrc;
    }

    // For local images, you can implement image optimization service
    // This is a placeholder implementation
    const params = new URLSearchParams();
    
    if (options.width) params.set('w', String(options.width));
    if (options.height) params.set('h', String(options.height));
    if (options.quality) params.set('q', String(options.quality));
    if (options.format && options.format !== 'auto') {
      params.set('f', options.format);
    }

    const queryString = params.toString();
    return queryString ? `${originalSrc}?${queryString}` : originalSrc;
  }

  // Custom placeholder component
  const CustomPlaceholder = () => (
    <Skeleton.Image
      active
      style={{
        width: width || '100%',
        height: height || 200,
        ...style
      }}
    />
  );

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '6px',
        ...style
      }}
    >
      <Image
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        placeholder={placeholder || <CustomPlaceholder />}
        onLoad={handleLoad}
        onError={handleError}
        onClick={handleClick}
        style={{
          transition: 'opacity 0.3s ease',
          opacity: imageState.loaded ? 1 : 0.7,
          cursor: onClick ? 'pointer' : 'default'
        }}
        preview={{
          mask: 'Ko\'rish',
          maskClassName: 'image-preview-mask'
        }}
      />
      
      {/* Loading indicator */}
      {imageState.loading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.8)',
            zIndex: 1
          }}
        >
          <Skeleton.Image active />
        </div>
      )}
      
      {/* Error state */}
      {imageState.error && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f5f5',
            color: '#999',
            fontSize: '14px',
            zIndex: 1
          }}
        >
          Rasm yuklanmadi
        </div>
      )}
    </div>
  );
});

// Image optimization utilities
export const imageOptimization = {
  // Generate responsive image srcSet
  generateSrcSet: (
    baseSrc: string,
    sizes: number[],
    quality: number = 80
  ): string => {
    return sizes
      .map(size => `${generateOptimizedImageUrl(baseSrc, { width: size, quality })} ${size}w`)
      .join(', ');
  },

  // Generate responsive image sizes attribute
  generateSizes: (breakpoints: { [key: string]: string }): string => {
    return Object.entries(breakpoints)
      .map(([condition, size]) => `(${condition}) ${size}`)
      .join(', ');
  },

  // Preload critical images
  preloadImage: (src: string, options?: { width?: number; height?: number }): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      if (options?.width) img.width = options.width;
      if (options?.height) img.height = options.height;
      
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = src;
    });
  },

  // Batch preload images
  preloadImages: async (
    images: Array<{ src: string; options?: { width?: number; height?: number } }>
  ): Promise<void[]> => {
    return Promise.all(
      images.map(({ src, options }) => preloadImage(src, options))
    );
  }
};

// Helper function for generating optimized URLs
function generateOptimizedImageUrl(
  originalSrc: string,
  options: {
    width?: number | string;
    height?: number | string;
    quality?: number;
    format?: string;
  }
): string {
  if (originalSrc.startsWith('data:') || originalSrc.startsWith('http')) {
    return originalSrc;
  }

  const params = new URLSearchParams();
  
  if (options.width) params.set('w', String(options.width));
  if (options.height) params.set('h', String(options.height));
  if (options.quality) params.set('q', String(options.quality));
  if (options.format && options.format !== 'auto') {
    params.set('f', options.format);
  }

  const queryString = params.toString();
  return queryString ? `${originalSrc}?${queryString}` : originalSrc;
}

export default OptimizedImage;