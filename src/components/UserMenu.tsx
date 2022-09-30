import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import { AccountCircle } from '@mui/icons-material';
import MoreIcon from '@mui/icons-material/More';
import { Box, IconButton, Menu, MenuItem } from '@mui/material';
import { signOut } from 'firebase/auth';
import { useState, MouseEvent } from 'react';
import { useAuth } from './Auth';
import { auth } from '../firebase-app';
import { FirebaseError } from '@firebase/app';
import { Link, useLocation } from 'react-router-dom';

export const UserMenu = (): JSX.Element => {
  const currentUser = useAuth();
  const location = useLocation();

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

  const renderLoginButton = (
    <IconButton size="large" edge="end" aria-label="login" color="inherit">
      <Link to={{ pathname: '/login' }} state={location.pathname}>
        <LoginIcon />
      </Link>
    </IconButton>
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
        <IconButton
          size="large"
          aria-label="account of current user"
          aria-controls="primary-search-account-menu"
          aria-haspopup="true"
          color="inherit"
        >
          {currentUser !== null ? <AccountCircle /> : renderLoginButton}
        </IconButton>
        <p>User</p>
      </MenuItem>
    </Menu>
  );

  const renderLoggedUser = (
    <>
      <MenuItem>{currentUser?.email}</MenuItem>
      <MenuItem onClick={handleProfile} disabled>
        Profile
      </MenuItem>
      <MenuItem onClick={handleLogout}>
        <LogoutIcon />
        <p>Logout</p>
      </MenuItem>
    </>
  );

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
            <AccountCircle />
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
