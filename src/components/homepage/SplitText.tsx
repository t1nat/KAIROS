"use client";

import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface SplitTextProps {
  children?: ReactNode;
  text?: string;
  delay?: number;
  className?: string;
  onComplete?: () => void;
}

const SplitText: React.FC<SplitTextProps> = ({
  children,
  text,
  delay = 50,
  className = '',
  onComplete
}) => {
  const [animatedLetters, setAnimatedLetters] = useState<number>(0);
  
  const content = text ?? (typeof children === 'string' ? children : '');
  const letters = content.split('');

  useEffect(() => {
    if (animatedLetters < letters.length) {
      const timer = setTimeout(() => {
        setAnimatedLetters(prev => prev + 1);
      }, delay);
      return () => clearTimeout(timer);
    } else if (animatedLetters === letters.length && onComplete) {
      onComplete();
    }
  }, [animatedLetters, letters.length, delay, onComplete]);

  return (
    <h1 className={className}>
      {letters.map((letter, index) => (
        <span
          key={index}
          className="inline-block"
          style={{
            opacity: index < animatedLetters ? 1 : 0,
            transform: index < animatedLetters ? 'translateY(0)' : 'translateY(6px)',
            filter: index < animatedLetters ? 'blur(0px)' : 'blur(4px)',
            transition: 'opacity 0.4s ease-out, transform 0.4s ease-out, filter 0.4s ease-out'
          }}
        >
          {letter === ' ' ? '\u00A0' : letter}
        </span>
      ))}
    </h1>
  );
};

export default SplitText;