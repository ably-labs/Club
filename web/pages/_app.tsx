import React, { ComponentType, ReactElement } from 'react';
// import '../styles/global.css';
import 'tailwindcss/tailwind.css'
import adapter from 'webrtc-adapter';

interface Props {
  Component: ComponentType;
  pageProps: any;
}

export default function App({ Component, pageProps }: Props): ReactElement {
  return <Component {...pageProps} />;
}
