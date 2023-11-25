import { useState } from 'react';

export function Index() {
  const [firstOpen, setFirstOpen] = useState(false);
  const [secondOpen, setSecondOpen] = useState(false);
  const [thirdOpen, setThirdOpen] = useState(false);
  return (
    <div className="fixed top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%]">
      <button
        className="button-one mx-2"
        aria-controls="primary-navigation"
        aria-expanded={firstOpen ? 'true' : 'false'}
        onClick={() => setFirstOpen(o => !o)}
      >
        <svg
          fill="var(--button-color)"
          className="hamburger"
          viewBox="0 0 100 100"
          width="250"
        >
          <rect
            className="line top"
            width="80"
            height="10"
            x="10"
            y="25"
            rx="5"
          ></rect>
          <rect
            className="line middle"
            width="80"
            height="10"
            x="10"
            y="45"
            rx="5"
          ></rect>
          <rect
            className="line bottom"
            width="80"
            height="10"
            x="10"
            y="65"
            rx="5"
          ></rect>
        </svg>
      </button>
      <button
        className="button-two mx-2"
        aria-expanded={secondOpen ? 'true' : 'false'}
        onClick={() => setSecondOpen(o => !o)}
      >
        <svg
          stroke="var(--button-color)"
          className="hamburger"
          viewBox="0 0 100 100"
          width="250"
        >
          <line
            className="line top"
            x1="90"
            x2="10"
            y1="40"
            y2="40"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray="80"
            strokeDashoffset="0"
          ></line>
          <line
            className="line bottom"
            x1="10"
            x2="90"
            y1="60"
            y2="60"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray="80"
            strokeDashoffset="0"
          ></line>
        </svg>
      </button>
      <button
        className="button-three mx-2"
        aria-expanded={thirdOpen ? 'true' : 'false'}
        onClick={() => setThirdOpen(o => !o)}
      >
        <svg
          stroke="var(--button-color)"
          className="hamburger"
          viewBox="-10 -10 120 120"
          width="250"
          fill="none"
        >
          <path className='line' strokeWidth="10" strokeLinecap='round' strokeLinejoin='round' d="m 20 40 h 60 a 1 1 0 0 1 0 20 h -60 a 1 1 0 0 1 0 -40 h 30 v 70"></path>
        </svg>
      </button>
    </div>
  );
}

export default Index;
