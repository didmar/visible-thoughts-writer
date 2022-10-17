import { CssBaseline } from '@mui/material';
import { Fragment } from 'react';
import { Route, Routes } from 'react-router-dom';
import './App.css';
import AuthProvider from './components/Auth';
import { WindowContextProvider } from './components/WindowContextProvider';
import HomePage from './pages/HomePage';
import InvitePage from './pages/InvitePage';
import LoginPage from './pages/LoginPage';
import RunPage from './pages/RunPage';

function App(): JSX.Element {
  return (
    <Fragment>
      <CssBaseline />
      <AuthProvider>
        <WindowContextProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/runs/:runId" element={<RunPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/invite" element={<InvitePage />} />
          </Routes>
        </WindowContextProvider>
      </AuthProvider>
    </Fragment>
  );
}

export default App;
