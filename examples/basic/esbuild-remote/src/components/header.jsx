import React from "react";
import styles from "./header.module.css";
import Button from './Button';

export default function Header({ children }) {
  console.log(styles.header);
  return (
    <header className={styles.header}>
      <div>{children}</div>
      <Button label="click me" />
    </header>
  );
}
