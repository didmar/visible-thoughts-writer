import { AccountCircle } from '@mui/icons-material';
import { Avatar } from '@mui/material';
import { User } from './Auth';

interface Props {
  user: User | null;
}

const UserAvatar = ({ user }: Props): JSX.Element => {
  if (user !== null) {
    const photoURL = user.firebaseUser.photoURL;
    if (photoURL !== null) {
      return <Avatar src={photoURL} />;
    }

    const name = user.firebaseUser.displayName;
    if (name !== null) {
      return <Avatar {...stringAvatar(name)} />;
    }
  }

  return (
    <Avatar>
      <AccountCircle />
    </Avatar>
  );
};

export default UserAvatar;

// Taken from MUI documentation
function stringAvatar(name: string): object {
  return {
    sx: {
      bgcolor: stringToColor(name),
    },
    children: `${name.split(' ')[0][0]}${name.split(' ')[1][0]}`,
  };
}

function stringToColor(string: string): string {
  let hash = 0;
  let i;

  /* eslint-disable no-bitwise */
  for (i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = '#';

  for (i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  /* eslint-enable no-bitwise */

  return color;
}
