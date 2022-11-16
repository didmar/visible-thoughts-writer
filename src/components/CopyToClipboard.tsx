import LinkIcon from '@mui/icons-material/Link';
import { IconButton, Tooltip } from '@mui/material';
import copy from 'clipboard-copy';
import React, { useState } from 'react';

interface Props {
  content: string;
}

const CopyToClipboard: React.FunctionComponent<Props> = ({
  content,
}: Props) => {
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

  const onCopy = (): void => {
    void (async function () {
      await copy(content);
    })();
    setShowTooltip(true);
  };

  return (
    <Tooltip
      open={showTooltip}
      title={'Copied to clipboard!'}
      leaveDelay={1500}
      onClose={() => setShowTooltip(false)}
    >
      <IconButton
        color="primary"
        aria-label="copy link to clipboard"
        onClick={onCopy}
      >
        <LinkIcon />
      </IconButton>
    </Tooltip>
  );
};

export default CopyToClipboard;
