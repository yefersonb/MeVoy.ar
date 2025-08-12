// src/components/TabNavigation.jsx
import React from 'react';

const TabButton = ({ active, children, onClick }) => (
  <span
    onClick={onClick}
    style={{
      cursor: "pointer",
      color: active ? "#2563eb" : "#444",
      fontWeight: 500,
      fontSize: "1.05rem",
      position: "relative",
      marginRight: "2.5rem",
      paddingBottom: 6,
      transition: "color 0.2s ease",
      display: "inline-block",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.color = "#2563eb")}
    onMouseLeave={(e) =>
      (e.currentTarget.style.color = active ? "#2563eb" : "#444")
    }
  >
    {children}
    <span
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 2,
        background: "#2563eb",
        transform: active ? "scaleX(1)" : "scaleX(0)",
        transformOrigin: "left",
        transition: "transform 0.3s",
      }}
    />
  </span>
);

const TabNavigation = ({
  activeTab,
  onTabChange,
  menuItems = [],
  onCreateTrip,
  userRole,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      paddingLeft: "2rem",
      paddingTop: "2rem",
      marginBottom: "2rem",
      borderBottom: "1px solid #e2e8f0",
    }}
  >
    <div style={{ display: "flex", gap: "0.5rem" }}>
      {menuItems.map((item) => (
        <TabButton
          key={item}
          active={activeTab === item}
          onClick={() => onTabChange(item)}
        >
          {item}
        </TabButton>
      ))}
    </div>
    {userRole === "conductor" && (
      <div>
        <button
          onClick={onCreateTrip}
          style={{
            background: "#2563eb",
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
