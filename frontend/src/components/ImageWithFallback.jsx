import { useState, useEffect } from "react";

const ImageWithFallback = ({ src, fallbackSrc, alt, className, onError }) => {
  const [imageSrc, setImageSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (src && fallbackSrc && src !== fallbackSrc && !src.startsWith('blob:')) {
      setIsLoading(true);
      
      const img = new Image();
      img.onload = () => {
        setImageSrc(src);
        setIsLoading(false);
      };
      img.onerror = () => {
        setImageSrc(fallbackSrc);
        setIsLoading(false);
      };
      img.src = src;
      
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