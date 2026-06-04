import { createContext, useCallback, useContext, useMemo, useState } from "react";
import BottomSheet from "../components/common/BottomSheet";
import UserCardContent from "../components/UserCardSheet";

const DrawerContext = createContext(null);

export function UserCardProvider({ children }) {
    const [drawer, setDrawer] = useState(null); // { content: ReactNode, label: string }

    const closeDrawer = useCallback(() => setDrawer(null), []);

    // Generic entry point — pass any JSX and an optional sheet label
    const openDrawer = useCallback((content, label = "Panel") => {
        setDrawer({ content, label });
    }, []);

    // Convenience wrapper that opens a user profile card
    const openCard = useCallback((uid, contextRole) => {
        openDrawer(
            <UserCardContent uid={uid} contextRole={contextRole} />,
            "Perfil de usuario"
        );
    }, [openDrawer]);

    const value = useMemo(
        () => ({ openDrawer, openCard, closeDrawer }),
        [openDrawer, openCard, closeDrawer]
    );

    return (
        <DrawerContext.Provider value={value}>
            {children}
            {drawer && (
                <BottomSheet onClose={closeDrawer} label={drawer.label}>
                    {drawer.content}
                </BottomSheet>
            )}
        </DrawerContext.Provider>
    );
}

// Primary hook — use this for new code
export function useDrawer() {
    const ctx = useContext(DrawerContext);
    if (!ctx) throw new Error("useDrawer must be used inside UserCardProvider");
    return ctx;
}

// Backwards-compatible alias — existing callers using useUserCard() keep working
export function useUserCard() {
    return useDrawer();
}
