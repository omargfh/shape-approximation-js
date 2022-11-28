import React from 'react';
import './App.css';
import Canvas from './components/Canvas';

const settings = {
  "maxWidth": 500,
  "maxHeight": 400,
  "debug": true,
}

function App() {
  return (
    <div id='App'>
      <div className='circles'>
        {['top', 'bottom'].map((position) => {
          return (
            <div className={['circle', 'circle-' + position].join(' ')}></div>
          )
        })}
      </div>
      <img className="logo" src="/images/logo.png" alt='logo' width="400" />
      <Canvas settings={settings} />
    </div>
  );
}

export default App;
