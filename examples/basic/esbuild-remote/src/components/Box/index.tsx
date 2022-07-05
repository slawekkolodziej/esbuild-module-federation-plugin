import React from 'react';

const RemoteBox = React.lazy(() => import('webpackRemote/box'))

export const Box = props => {
  return (
    <div>
      <RemoteBox>hello</RemoteBox>
      {props.children}
    </div>
  )
}

export default Box;