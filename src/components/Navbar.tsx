import { Menu } from '@mui/icons-material';
import { AppBar, Box, IconButton, Toolbar, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../App.css';
import UserMenu from '../components/UserMenu';
import {
  getUserProfile,
  getUserRolesInRun,
  isAdmin,
  Role,
  Run,
} from '../firebase-app';
import { useAuth } from './Auth';
import HelpAndFeedback from './HelpModal';
import RunSettingsModal from './RunSettingsModal';

interface Props {
  run?: Run;
}

const Navbar = ({ run }: Props): JSX.Element => {
  const [roles, setRoles] = useState<Set<Role> | null | undefined>(undefined);
  const [adminName, setAdminName] = useState<string | undefined>(undefined);
  const [userIsReviewer, setUserIsReviewer] = useState<boolean>(false);

  const currentUser = useAuth();

  useEffect(() => {
    console.log('Navbar > useEffect [currentUser]: ', currentUser);

    void (async function () {
      const uid = currentUser?.uid();
      if (run !== undefined && uid !== undefined) {
        // What is the role of current user for this particular run?
        const roles = await getUserRolesInRun(uid, run);
        setRoles(roles);
        // Retrieve name of run's admin to display in the navbar
        const adminUserProfile = await getUserProfile(run.admin);
        setAdminName(adminUserProfile?.name);
        // Is the current user a reviewer?
        const userProfile = isAdmin(roles)
          ? adminUserProfile
          : await getUserProfile(uid);
        setUserIsReviewer(userProfile?.isReviewer ?? false);
      } else {
        setRoles(null); // Guest
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

  const runPageTitle: JSX.Element = (
    <>
      {homeIcon}
      {run !== undefined &&
        pageTitle(`"${run.title}" by ${adminName ?? '???'}`)}
    </>
  );

  const titleElement = run === undefined ? homePageTitle : runPageTitle;

  const runSettings = run !== undefined &&
    (isAdmin(roles) || userIsReviewer) && (
      // Forcing the modal to open if the run has no description
      <RunSettingsModal
        initRun={run}
        initOpen={(run.desc?.length ?? 0) === 0}
      />
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
