import React from 'react';
import { createRoot } from 'react-dom/client';

export default function Landing() {
  return (
    <>
      <h1>Hi</h1>
      <p>Hello there.<br />How do you do?</p>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<Landing />);