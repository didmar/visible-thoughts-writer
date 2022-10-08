import { CssBaseline } from '@mui/material';
import { Fragment } from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import LogIn from './components/LogIn';
import RunsPane from './components/RunsPane';
import StepsPane from './components/StepsPane';
import AuthProvider from './components/Auth';
import InvitePage from './components/InvitePage';

function App(): JSX.Element {
  return (
    <Fragment>
      <CssBaseline />
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RunsPane />} />
          <Route path="/runs/:runId" element={<StepsPane />} />
          <Route path="/login" element={<LogIn />} />
          <Route path="/invite" element={<InvitePage />} />
        </Routes>
      </AuthProvider>
    </Fragment>
  );
}

export default App;
