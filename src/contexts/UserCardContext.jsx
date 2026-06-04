import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import BottomSheet from "../components/common/BottomSheet";
import UserCardContent from "../components/UserCardSheet";

const DrawerContext = createContext(null);

export function UserCardProvider({ children }) {
    const [stack, setStack] = useState([]); // [{ id, content, label }, ...]
    const nextId = useRef(0);

    // Push a new sheet on top of the stack
    const openDrawer = useCallback((content, label = "Panel") => {
        const id = ++nextId.current;
        setStack(s => [...s, { id, content, label }]);
    }, []);

    // Pop the top sheet (close button / backdrop tap)
    const closeDrawer = useCallback(() => {
        setStack(s => s.slice(0, -1));
    }, []);

    // Nuke the whole stack (e.g. navigate away)
    const closeAll = useCallback(() => setStack([]), []);

    const openCard = useCallback((uid, contextRole) => {
        openDrawer(
            <UserCardContent uid={uid} contextRole={contextRole} />,
            "Perfil de usuario"
        );
    }, [openDrawer]);

    const value = useMemo(
        () => ({ openDrawer, openCard, closeDrawer, closeAll }),
        [openDrawer, openCard, closeDrawer, closeAll]
    );

    return (
        <DrawerContext.Provider value={value}>
            {children}
            {stack.map((item, i) => (
                <BottomSheet
                    key={item.id}
                    onClose={closeDrawer}
                    label={item.label}
                    depth={stack.length - 1 - i}
                >
                    {item.content}
                </BottomSheet>
            ))}
        </DrawerContext.Provider>
    );
}

export function useDrawer() {
    const ctx = useContext(DrawerContext);
    if (!ctx) throw new Error("useDrawer must be used inside UserCardProvider");
    return ctx;
}

// Backwards-compatible alias
export function useUserCard() {
    return useDrawer();
}
