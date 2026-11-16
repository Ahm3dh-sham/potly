'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  MotionValue,
  motion,
  motionValue,
  useSpring,
  useTransform,
} from 'framer-motion';

const TRANSITION = {
  type: 'spring' as const,
  stiffness: 280,
  damping: 18,
  mass: 0.3,
};

function NumberCell({ mv, number }: { mv: MotionValue<number>; number: number }) {
  const uniqueId = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const updateHeight = () => {
      const rect = el.getBoundingClientRect();
      if (rect.height > 0) {
        setHeight(rect.height);
      }
    };

    updateHeight();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateHeight);
      observer.observe(el);
      return () => observer.disconnect();
    }

    return undefined;
  }, []);

  const y = useTransform(mv, (latest) => {
    if (!height) return 0;
    const placeValue = latest % 10;
    const offset = (10 + number - placeValue) % 10;
    let memo = offset * height;

    if (offset > 5) {
      memo -= 10 * height;
    }

    return memo;
  });

  if (!height) {
    return (
      <span
        ref={ref}
        className="invisible absolute inset-0 flex items-center justify-center"
      >
        {number}
      </span>
    );
  }

  return (
    <motion.span
      style={{ y }}
      layoutId={uniqueId}
      className="absolute inset-0 flex items-center justify-center"
      transition={TRANSITION}
      ref={ref}
    >
      {number}
    </motion.span>
  );
}

function Digit({ value, place }: { value: number; place: number }) {
  const valueRoundedToPlace = Math.floor(value / place) % 10;
  const initial = motionValue(valueRoundedToPlace);
  const animatedValue = useSpring(initial, TRANSITION);

  useEffect(() => {
    animatedValue.set(valueRoundedToPlace);
  }, [animatedValue, valueRoundedToPlace]);

  return (
    <div className="relative inline-block w-[1ch] overflow-x-visible overflow-y-clip leading-none tabular-nums">
      <div className="invisible">0</div>
      {Array.from({ length: 10 }, (_, i) => (
        <NumberCell key={i} mv={animatedValue} number={i} />
      ))}
    </div>
  );
}

export type SlidingNumberProps = {
  value: number;
  padStart?: boolean;
  decimalSeparator?: string;
};

export function SlidingNumber({
  value,
  padStart = false,
  decimalSeparator = '.',
}: SlidingNumberProps) {
  const absValue = Math.abs(value);
  const [integerPart = '0', decimalPart] = absValue.toString().split('.');
  const integerValue = parseInt(integerPart, 10) || 0;
  const paddedInteger =
    padStart && integerValue < 10 ? `0${integerPart}` : integerPart;
  const integerDigits = paddedInteger.split('');
  const integerPlaces = integerDigits.map((_, i) =>
    Math.pow(10, integerDigits.length - i - 1)
  );

  return (
    <div className="inline-flex items-center">
      {value < 0 && '-'}
      {integerDigits.map((_, index) => (
        <Digit
          key={`pos-${integerPlaces[index] ?? 1}`}
          value={integerValue}
          place={integerPlaces[index] ?? 1}
        />
      ))}
      {decimalPart && (
        <>
          <span>{decimalSeparator}</span>
          {decimalPart.split('').map((_, index, arr) => (
            <Digit
              key={`decimal-${index}`}
              value={parseInt(decimalPart, 10) || 0}
              place={Math.pow(10, arr.length - index - 1)}
            />
          ))}
        </>
      )}
    </div>
  );
}

export function SlidingNumberWithSlider() {
  const [value, setValue] = useState(100);

  return (
    <div className="flex flex-col items-start gap-0">
      <div className="flex items-center gap-2 font-mono">Current ARR:</div>
      <div className="inline-flex items-center gap-1 font-mono leading-none">
        $<SlidingNumber value={value} />
      </div>
      <input
        type="range"
        value={value}
        min={500}
        max={100000}
        step={50}
        onChange={(e) => setValue(+e.target.value)}
        className="mt-2 accent-indigo-950"
      />
    </div>
  );
}
