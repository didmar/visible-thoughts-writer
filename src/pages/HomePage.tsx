import { Box } from '@mui/material';
import '../App.css';
import AddRunModal from '../components/AddRunModal';
import { useAuth } from '../components/Auth';
import Navbar from '../components/Navbar';
import RunsListing from '../components/RunsListing';
import SimpleRunsListing from '../components/SimpleRunsListing';
import conf from '../conf.json';

function HomePage(): JSX.Element {
  const currentUser = useAuth();

  return (
    <div className="HomePage">
      <>
        <Navbar />
        <Box
          className="HomePage"
          sx={{
            m: 2,
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '1024px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          {conf.searchableRunsList ? (
            <RunsListing userId={currentUser?.uid()} />
          ) : (
            <SimpleRunsListing userId={currentUser?.uid()} />
          )}
        </Box>
        {currentUser !== null && currentUser !== undefined && <AddRunModal />}
      </>
    </div>
  );
}

export default HomePage;
