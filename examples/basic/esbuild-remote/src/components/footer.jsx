import React, { useState } from "react";
import Button from './Button';

const LazyComponent = React.memo(() => import('./header'))

export default function Footer({ children }) {
  const [counter, setCounter] = useState(0);

  
  return (
    <footer>
      <LazyComponent />
      <div>{children}</div>
      <Button label={`click me ${counter}`} onClick={() => setCounter(value => value + 1)} />
      <div>&copy; {(new Date()).getFullYear()}</div>
    </footer>
  );
}
