import React, { FC, ReactElement } from 'react';
import styles from './layout.module.css';

interface Props {
  children: React.ReactNode;
}

export default function Layout({ children }: Props): ReactElement {
  return <div className={"content-center mx-5"}>{children}</div>;
}
