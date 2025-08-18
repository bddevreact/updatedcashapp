import React, { useEffect, useState } from 'react';

interface Props {
  amount: number;
  onComplete: () => void;
}

export default function PointAnimation({ amount, onComplete }: Props) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      onComplete();
    }, 1000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!show) return null;

  return (
    <div className="absolute left-1/2 -translate-x-1/2 -top-8 text-xl font-bold text-white animate-float-up">
      +{amount}
    </div>
  );
}