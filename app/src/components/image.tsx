import React from 'react'
export const Image = ({ src, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) =>
    <img {...props} />
