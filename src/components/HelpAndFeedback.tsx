import { Button } from '@mui/material';

import conf from '../conf.json';

const HelpAndFeedback = (): JSX.Element => {
  return (
    <Button color="inherit" href={conf.helpAndFeedbackLink} target="_blank">
      Help &amp; Feedback
    </Button>
  );
};

export default HelpAndFeedback;
