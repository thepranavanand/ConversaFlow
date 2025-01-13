import { useState, useEffect } from "react";

const ImageWithFallback = ({ src, fallbackSrc, alt, className, onError }) => {
  const [imageSrc, setImageSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If we have a real URL and a fallback blob URL, preload the real image
    if (src && fallbackSrc && src !== fallbackSrc && !src.startsWith('blob:')) {
      setIsLoading(true);
      
      const img = new Image();
      img.onload = () => {
        setImageSrc(src); // Switch to real URL once loaded
        setIsLoading(false);
      };
      img.onerror = () => {
        setImageSrc(fallbackSrc); // Keep using blob URL if real URL fails
        setIsLoading(false);
      };
      img.src = src;
      
      // Start with fallback while loading
      setImageSrc(fallbackSrc);
    } else {
      setImageSrc(src);
    }
  }, [src, fallbackSrc]);

  const handleError = (e) => {
    if (fallbackSrc && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
    } else if (onError) {
      onError(e);
    }
  };

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onError={handleError}
    />
  );
};

export default ImageWithFallback; 