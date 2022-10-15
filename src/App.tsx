import { CssBaseline } from '@mui/material';
import { Fragment } from 'react';
import { Route, Routes } from 'react-router-dom';
import './App.css';
import AuthProvider from './components/Auth';
import InvitePage from './components/InvitePage';
import LogIn from './components/LogIn';
import RunsPane from './components/RunsPane';
import StepsPane from './components/StepsPane';
import { WindowContextProvider } from './components/WindowContextProvider';

function App(): JSX.Element {
  return (
    <Fragment>
      <CssBaseline />
      <AuthProvider>
        <WindowContextProvider>
          <Routes>
            <Route path="/" element={<RunsPane />} />
            <Route path="/runs/:runId" element={<StepsPane />} />
            <Route path="/login" element={<LogIn />} />
            <Route path="/invite" element={<InvitePage />} />
          </Routes>
        </WindowContextProvider>
      </AuthProvider>
    </Fragment>
  );
}

export default App;
