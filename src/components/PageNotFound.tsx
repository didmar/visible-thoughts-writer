import { Button, Typography } from '@mui/material';
import { Home } from '@mui/icons-material';

function PageNotFound(): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: `calc(100vh - 64px)`,
      }}
    >
      <Typography variant="h4">404</Typography>
      <Typography variant="subtitle1">Page not found!</Typography>
      <Button
        color="primary"
        aria-label="home"
        href="/"
        style={{ marginTop: 20 }}
      >
        <Home />
      </Button>
    </div>
  );
}

export default PageNotFound;
