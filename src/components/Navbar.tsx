import { Menu } from '@mui/icons-material';
import { AppBar, Box, IconButton, Toolbar, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../App.css';
import HelpAndFeedback from './HelpModal';
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

  const pageTitle = (title: string): JSX.Element => (
    <Typography
      variant="h6"
      component="div"
      noWrap
      sx={{
        flexGrow: 1,
      }}
    >
      {title}
    </Typography>
  );

  const homePageTitle = pageTitle('Visible Thoughts Writer');

  const homeIcon: JSX.Element = (
    <Link to="/">
      <IconButton
        size="large"
        edge="start"
        color="inherit"
        aria-label="menu"
        sx={{ mr: 2 }}
      >
        <Menu />
      </IconButton>
    </Link>
  );

  const runPageTitle = (_run: Run): JSX.Element => {
    const title = _run.title !== undefined ? _run.title : '';
    return (
      <>
        {homeIcon}
        {pageTitle(title)}
      </>
    );
  };

  const titleElement = run === undefined ? homePageTitle : runPageTitle(run);

  const runSettings = run !== undefined && isDM(role) && (
    <RunSettingsModal run={run} />
  );

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          {titleElement}
          <HelpAndFeedback />
          {runSettings}
          <UserMenu />
        </Toolbar>
      </AppBar>
    </Box>
  );
};

export default Navbar;
