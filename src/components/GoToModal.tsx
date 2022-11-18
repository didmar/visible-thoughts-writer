import NavigationIcon from '@mui/icons-material/Navigation';
import { Box, Button, Fab, FormControl, Modal, TextField } from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../firebase-app';

const style = {
  position: 'fixed',
  top: 75,
  left: 65,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

function GoToModal(): JSX.Element {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const handleOpen = (): void => setOpen(true);
  const handleClose = (): void => setOpen(false);

  const [targetStep, setTargetStep] = useState<string | undefined>(undefined);

  useEffect(() => {
    console.log('GoToModal > useEffect []');
  }, []);

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    if (targetStep === undefined) throw new Error('targetStep is undefined');
    if (!isValidStepNumber(targetStep))
      throw new Error('targetStep should be a valid number');

    navigate({ search: `?n=${targetStep}` });
    setOpen(false);
  };

  const isValidStepNumber = (step: string): boolean => {
    const stepNumber = parseInt(step, 10);
    return !isNaN(stepNumber) && stepNumber > 0;
  };

  const targetStepEditForm = (
    <Box sx={style}>
      <form onSubmit={onSubmit}>
        <FormControl>
          <TextField
            inputRef={(input) => input?.focus()}
            error={
              targetStep !== undefined &&
              targetStep !== '' &&
              !isValidStepNumber(targetStep)
            }
            id="name-input"
            label="Step number"
            name="step-number-input"
            variant="outlined"
            size={'small'}
            value={targetStep}
            onChange={(event) => {
              setTargetStep(event.target.value);
            }}
            inputProps={{ maxLength: UserProfile.maxNameLength }}
          />
        </FormControl>
        <Button
          sx={{ ml: 2 }}
          type="submit"
          variant="contained"
          disabled={targetStep === undefined || !isValidStepNumber(targetStep)}
        >
          Go to
        </Button>
      </form>
    </Box>
  );

  return (
    <div>
      <Fab
        size="medium"
        color="primary"
        style={{
          position: 'fixed',
          top: 75,
          left: 10,
        }}
        aria-label="goto"
        onClick={handleOpen}
      >
        <NavigationIcon />
      </Fab>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="goto-modal-title"
        aria-describedby="goto-modal-description"
      >
        {targetStepEditForm}
      </Modal>
    </div>
  );
}

export default GoToModal;
