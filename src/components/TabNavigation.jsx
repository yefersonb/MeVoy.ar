// src/components/TabNavigation.jsx
import React from 'react';


// ToDo: Modificar el TabButton para que use CSS en lugar de MouseEvents
const TabButton = ({ active, children, onClick }) => (
  <div
    onClick={onClick}
    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-primary)")}
    onMouseLeave={(e) => (e.currentTarget.style.color = active ? "var(--color-primary)" : "#444")}
    style={{
      cursor: "pointer",
      color: active ? "var(--color-primary)" : "#444",
      fontWeight: 500,
      fontSize: "1.05rem",
      borderBottom: active ? "2px solid var(--color-primary)" : "2px solid #00000020",
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "border 0.1s"
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
    <div style={{ width: "100%", height: "4rem", display: "flex" }}>
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
            color: "#fff",
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
