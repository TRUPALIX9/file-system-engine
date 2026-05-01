import React from 'react';
import { Box, BoxProps } from '@mui/material';

interface CustomIconProps extends BoxProps {
  name: string;
  size?: number;
}

export const CustomIcon: React.FC<CustomIconProps> = ({ name, size = 20, sx, ...props }) => {
  const url = name.endsWith('.svg') ? name : `icons/${name}.svg`;
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        width: size,
        height: size,
        mask: `url('${url}') no-repeat center`,
        WebkitMask: `url('${url}') no-repeat center`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        bgcolor: 'currentColor',
        flexShrink: 0,
        ...sx
      }}
      {...props}
    />
  );
};
