import { Help } from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';

import conf from '../conf.json';

const HelpAndFeedback = (): JSX.Element => {
  return (
    <Tooltip title="Help">
      <IconButton
        edge="end"
        color="inherit"
        href={conf.helpAndFeedbackLink}
        target="_blank"
      >
        <Help />
      </IconButton>
    </Tooltip>
  );
};

export default HelpAndFeedback;
