import { FirebaseError } from '@firebase/app';
import { AccountCircle, Settings } from '@mui/icons-material';
import LogoutIcon from '@mui/icons-material/Logout';
import MoreIcon from '@mui/icons-material/More';
import {
  Box,
  Button,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Typography,
  useTheme,
} from '@mui/material';
import { signOut } from 'firebase/auth';
import { forwardRef, MouseEvent, useState } from 'react';
import { LinkProps, NavLink, useLocation } from 'react-router-dom';
import { auth } from '../firebase-app';
import { useAuth } from './Auth';
import UserAvatar from './UserAvatar';

export const UserMenu = (): JSX.Element => {
  const currentUser = useAuth();
  const location = useLocation();
  const { palette } = useTheme();

  const handleProfile = (): void => {
    console.log('handleProfile');
    // TODO implement
  };
  const handleLogout = (): void => {
    console.log('handleLogout');
    signOut(auth)
      .then(() => {
        console.log('Sign-out successful.');
      })
      .catch((error: FirebaseError) => {
        console.log('Error signing out: ', error);
      });
    handleMenuClose();
  };

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMoreAnchorEl, setMobileMoreAnchorEl] =
    useState<null | HTMLElement>(null);

  const isMenuOpen = Boolean(anchorEl);
  const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);

  const handleUserMenuOpen = (event: MouseEvent<HTMLElement>): void => {
    setAnchorEl(event.currentTarget);
  };

  const handleMobileMenuClose = (): void => {
    setMobileMoreAnchorEl(null);
  };

  const handleMenuClose = (): void => {
    setAnchorEl(null);
    handleMobileMenuClose();
  };

  const handleMobileMenuOpen = (event: MouseEvent<HTMLElement>): void => {
    setMobileMoreAnchorEl(event.currentTarget);
  };

  const LinkToLoginBehavior = forwardRef<any, Omit<LinkProps, 'to'>>(
    (props, ref) => (
      <NavLink
        ref={ref}
        to="/login"
        {...props}
        role={undefined}
        state={location.pathname}
        style={{
          color: palette.primary.main,
          backgroundColor: palette.primary.contrastText,
          borderColor: palette.primary.main,
        }}
      />
    )
  );
  LinkToLoginBehavior.displayName = 'LinkToLoginBehavior';

  const renderLoginButton = (
    <Button component={LinkToLoginBehavior} variant="contained">
      Sign in
    </Button>
  );

  const mobileMenuId = 'primary-search-account-menu-mobile';
  const renderMobileMenu = (
    <Menu
      anchorEl={mobileMoreAnchorEl}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      id={mobileMenuId}
      keepMounted
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={isMobileMenuOpen}
      onClose={handleMobileMenuClose}
    >
      <MenuItem onClick={handleUserMenuOpen}>
        <ListItemIcon>
          {currentUser !== null ? <AccountCircle /> : renderLoginButton}
        </ListItemIcon>
        <Typography>User</Typography>
      </MenuItem>
    </Menu>
  );

  const renderLoggedUser = [
    <MenuItem key="1" onClick={handleProfile} disabled>
      <Settings />
      Profile
    </MenuItem>,

    <MenuItem key="2" onClick={handleLogout}>
      <LogoutIcon />
      <p>Logout</p>
    </MenuItem>,
  ];

  const menuId = 'primary-search-account-menu';
  const renderUserMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      id={menuId}
      keepMounted
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={isMenuOpen}
      onClose={handleMenuClose}
    >
      {renderLoggedUser}
    </Menu>
  );

  if (currentUser === undefined) return <>Loading</>;

  return (
    <>
      <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
        {currentUser !== null ? (
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls={menuId}
            aria-haspopup="true"
            onClick={handleUserMenuOpen}
            color="inherit"
          >
            <UserAvatar user={currentUser} />
          </IconButton>
        ) : (
          renderLoginButton
        )}
      </Box>
      <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
        <IconButton
          size="large"
          aria-label="show more"
          aria-controls={mobileMenuId}
          aria-haspopup="true"
          onClick={handleMobileMenuOpen}
          color="inherit"
        >
          <MoreIcon />
        </IconButton>
      </Box>
      {renderMobileMenu}
      {currentUser !== null ? renderUserMenu : <></>}
    </>
  );
};

export default UserMenu;
