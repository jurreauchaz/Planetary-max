import React from 'react';
export default function NeonButton({children,onClick,variant='primary',type='button',disabled=false}:{children:React.ReactNode;onClick?:()=>void;variant?:'primary'|'subtle';type?:'button'|'submit';disabled?:boolean}) { return <button type={type} className={`neon-button ${variant}`} onClick={onClick} disabled={disabled}>{children}</button>; }
