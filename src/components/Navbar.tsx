import { AppBar, IconButton, Toolbar, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { Menu } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import '../App.css';
import HelpAndFeedback from '../components/HelpAndFeedback';
import UserMenu from '../components/UserMenu';
import { getUserRoleInRun, isDM, Role, Run } from '../firebase-app';
import { useAuth } from './Auth';
import RunSettingsModal from './RunSettingsModal';

interface Props {
  run?: Run;
}

const Navbar = ({ run }: Props): JSX.Element => {
  const [role, setRole] = useState<Role | null | undefined>(undefined);

  const currentUser = useAuth();

  useEffect(() => {
    console.log('Navbar > useEffect [currentUser]: ', currentUser);

    void (async function () {
      // Init role of user for this particular run
      const uid = currentUser?.uid();
      if (run !== undefined && uid !== undefined) {
        const role = await getUserRoleInRun(uid, run.id);
        setRole(role);
      } else {
        setRole(null); // Guest
      }
    })();
  }, [currentUser]);

  const homePageTitle: JSX.Element = (
    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
      Visible Thoughts Writer
    </Typography>
  );

  const homeIcon: JSX.Element = (
    <IconButton
      size="large"
      edge="start"
      color="inherit"
      aria-label="menu"
      sx={{ mr: 2 }}
    >
      <Link to="/">
        <Menu />
      </Link>
    </IconButton>
  );

  const runPageTitle = (_run: Run): JSX.Element => {
    return (
      <>
        {homeIcon}
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {_run.title !== undefined ? _run.title : ''}
        </Typography>
      </>
    );
  };

  const title = run === undefined ? homePageTitle : runPageTitle(run);

  const runSettings = run !== undefined && isDM(role) && (
    <RunSettingsModal run={run} />
  );

  return (
    <AppBar position="static">
      <Toolbar>
        {title}
        <HelpAndFeedback />
        {runSettings}
        <UserMenu />

        {/*
          <IconButton size="large" aria-label="search" color="inherit">
            <Settings />
          </IconButton>
        */}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
