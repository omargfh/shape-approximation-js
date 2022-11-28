import React from 'react';
import './App.css';
import Canvas from './components/Canvas';

const settings = {
  "maxWidth": 500,
  "maxHeight": 400,
}

function App() {
  return (
    <div id='App'>
      <img src="/images/logo.png" alt='logo' width="400" />
      <Canvas settings={settings} />
      {/* <div id='shapes'>
        <div id='square'/>
        <div id='ellipse'/>
        <div id='line'/>
      </div> */}
    </div>
  );
}

export default App;
