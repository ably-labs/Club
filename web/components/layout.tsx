import React, {ReactElement} from 'react';

interface Props {
  children: React.ReactNode;
}

export default function Layout({ children }: Props): ReactElement {
  return <div className={"content-center m-0 bg-red-100 min-h-screen"}>{children}</div>;
  // return <div className={"content-center m-0 h-screen"}>{children}</div>;
}
