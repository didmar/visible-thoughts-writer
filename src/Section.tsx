import BubbleChartIcon from '@mui/icons-material/BubbleChart';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CasinoIcon from '@mui/icons-material/Casino';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import { Section } from './firebase-app';

export const sectionsData = {
  [Section.InitT]: {
    icon: <BubbleChartIcon />,
  },
  [Section.Ppt]: {
    icon: <VisibilityIcon />,
  },
  [Section.PpptT]: {
    icon: <BubbleChartIcon />,
  },
  [Section.Act]: {
    icon: <DirectionsRunIcon />,
  },
  [Section.PactT]: {
    icon: <BubbleChartIcon />,
  },
  [Section.Out]: {
    icon: <CasinoIcon />,
  },
};
