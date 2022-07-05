import React, { useState } from 'react';
import styles from "../footer.module.css";

export const Button = props => {
  const [count, setCount] = useState(0);

  return (
    <button className={styles.footer} onClick={() => setCount((value) => value + 1)}>{props.label} [{count}]</button>
  )
}

export default Button;