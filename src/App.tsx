import { CssBaseline } from '@mui/material';
import { Fragment } from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import RunsPane from './components/RunsPane';
import StepsPane from './components/StepsPane';

function App(): JSX.Element {
  return (
    <Fragment>
      <CssBaseline />
      <Routes>
        <Route path="/" element={<RunsPane />} />
        <Route path="/runs/:runId" element={<StepsPane />} />
      </Routes>
    </Fragment>
  );
}

export default App;
