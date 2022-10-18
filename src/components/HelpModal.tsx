import { Help } from '@mui/icons-material';
import { Box, IconButton, Modal, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '75%',
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

const HelpModal = (): JSX.Element => {
  const [open, setOpen] = useState(false);
  const handleOpen = (): void => setOpen(true);
  const handleClose = (): void => setOpen(false);

  return (
    <>
      <Tooltip title="Help">
        <IconButton color="inherit" onClick={handleOpen}>
          <Help />
        </IconButton>
      </Tooltip>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Typography id="modal-modal-title" variant="h3">
            Help
          </Typography>
          <Box>
            <Typography sx={{ mt: 4 }} component="div">
              <p>
                Visible Thoughts Writer is an interface from the{' '}
                <a href="https://intelligence.org/2021/11/29/visible-thoughts-project-and-bounty-announcement/">
                  Visible Thought Project
                </a>
                .
              </p>{' '}
              <p>
                To get started, have a look at the video tutorial below. TODO
                add video.
              </p>
              <p>
                For any question, bug or feedback, please contact `didier#4229`
                on the{' '}
                <a href="https://discord.gg/Uv6QRKN5">
                  Visible Thoughts Discord server
                </a>
                .
              </p>
            </Typography>
          </Box>
        </Box>
      </Modal>
    </>
  );
};

export default HelpModal;
