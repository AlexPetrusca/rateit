import { createContext, useContext, useState } from 'react';

const IconPackContext = createContext(null);

export const IconPackProvider = ({ children }) => {
    const [iconPack, setIconPackState] = useState(
        () => localStorage.getItem('iconPack') || 'hand_drawn'
    );
    const setIconPack = (pack) => {
        localStorage.setItem('iconPack', pack);
        setIconPackState(pack);
    };
    return (
        <IconPackContext.Provider value={{ iconPack, setIconPack }}>
            {children}
        </IconPackContext.Provider>
    );
};

export const useIconPack = () => useContext(IconPackContext);
