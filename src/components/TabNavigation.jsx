// src/components/TabNavigation.jsx
import React from 'react';


// ToDo: Modificar el TabButton para que use CSS en lugar de MouseEvents
const TabButton = ({ active, children, onClick }) => (
  <div
    onClick={onClick}
    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-primary)")}
    onMouseLeave={(e) => (e.currentTarget.style.color = active ? "var(--color-primary)" : "#444")}
    style={{
      height: "3rem",
      padding: "1rem 0.5rem",
      display: "flex",
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      color: active ? "var(--color-primary)" : "#444",
      fontWeight: 500,
      borderBottom: active ? "2px solid var(--color-primary)" : "2px solid #00000020",
      transition: "border 0.1s",
      cursor: "pointer"
    }}>
    {children}
  </div>
);

const TabNavigation = ({
  activeTab,
  onTabChange,
  menuItems = [],
  onCreateTrip,
  userRole,
}) => (
  <div>
    <div style={{ display: "flex", overflow: "auto" }}>
      {
        menuItems.map((item) => (
          <TabButton key={item} active={activeTab === item} onClick={() => onTabChange(item)}> {item} </TabButton>
        ))
      }
    </div>

    {/* ToDo: Esto hay que moverlo a otro lado. No pertenece al TabNav */}
    {userRole === "conductor" && (
      <div>
        <button
          onClick={onCreateTrip}
          style={{
            background: "var(--color-primary)",
            color: "var(--color-surface)",
            padding: "0.5rem 1rem",
            borderRadius: 8,
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            fontSize: "1.05rem",
          }}
        >
          + Crear viaje
        </button>
      </div>
    )}
  </div>
);

export default TabNavigation;

