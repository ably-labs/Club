import React, { FC, ReactElement } from 'react';
import styles from './layout.module.css';

interface Props {
  children: React.ReactNode;
}

export default function Layout({ children }: Props): ReactElement {
  return <div className={styles.container}>{children}</div>;
}
