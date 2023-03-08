import { Help } from '@mui/icons-material';
import { Box, IconButton, Modal, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: {
    xs: '100%',
    sm: '75%',
    md: 620,
    lg: 620,
    xl: 620,
  },
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
                1. Read{' '}
                <a href="https://intelligence.org/visible/">this article</a>{' '}
                first to better understand the project
              </p>
              <p>
                2. Have a look at{' '}
                <a href="https://www.youtube.com/watch?v=SDv_tMeXDCY">
                  this video
                </a>{' '}
                to get started with the interface.
              </p>
              {/* Display video embed if screen height is enough */}
              <Box
                sx={{
                  display: {
                    xs: 'none',
                    sm: 'none',
                    md: 'block',
                    lg: 'block',
                    xl: 'block',
                  },
                }}
              >
                <iframe
                  width="560"
                  height="315"
                  src="https://www.youtube.com/embed/SDv_tMeXDCY"
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  style={{ alignContent: 'center' }}
                ></iframe>
              </Box>
              <p>
                For questions about the <b>project</b>, please contact{' '}
                <a href="mailto:vtp@intelligence.org">vtp@intelligence.org</a>
              </p>
              <p>
                For questions, bug or feedback about this <b>interface</b>,
                please report on the <b>#writer-tool</b> channel of{' '}
                <a href="https://discord.gg/Uv6QRKN5">
                  Visible Thoughts Discord server
                </a>
              </p>
            </Typography>
          </Box>
        </Box>
      </Modal>
    </>
  );
};

export default HelpModal;
