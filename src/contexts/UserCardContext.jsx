import { createContext, useCallback, useContext, useState } from "react";
import UserCardSheet from "../components/UserCardSheet";

const UserCardContext = createContext(null);

export function UserCardProvider({ children }) {
    const [card, setCard] = useState(null); // { uid, contextRole? }

    // contextRole: "conductor" | "viajero" — overrides the profile's own rol
    // so you can view someone as their role in a specific trip/booking context
    const openCard = useCallback((uid, contextRole) => {
        setCard({ uid, contextRole: contextRole || null });
    }, []);

    const closeCard = useCallback(() => setCard(null), []);

    return (
        <UserCardContext.Provider value={{ openCard }}>
            {children}
            {card && (
                <UserCardSheet
                    uid={card.uid}
                    contextRole={card.contextRole}
                    onClose={closeCard}
                />
            )}
        </UserCardContext.Provider>
    );
}

export function useUserCard() {
    const ctx = useContext(UserCardContext);
    if (!ctx) throw new Error("useUserCard must be used inside UserCardProvider");
    return ctx;
}
