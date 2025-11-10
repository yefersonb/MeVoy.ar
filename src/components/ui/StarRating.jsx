import React from 'react';

const Rating = ({ rating = 0 }) => {
  const fillPercentage = (rating / 5) * 100;
  
  // Generate a unique gradient ID based on the rating
  const gradientId = `gradient-${rating}`;
  
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 7" width="100%" height="100%">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset={`${fillPercentage}%`} stopColor="#c7831eff" />
          <stop offset={`${fillPercentage}%`} stopColor="#00000015" />
        </linearGradient>
      </defs>
      <path
        d="
          M4,0 L5,3 L8,3 L5.5,4.5 L6.5,7 L4,5.5 L1.5,7 L2.5,4.5 L0,3 L3,3
          M12,0 L13,3 L16,3 L13.5,4.5 L14.5,7 L12,5.5 L9.5,7 L10.5,4.5 L8,3 L11,3
          M20,0 L21,3 L24,3 L21.5,4.5 L22.5,7 L20,5.5 L17.5,7 L18.5,4.5 L16,3 L19,3
          M28,0 L29,3 L32,3 L29.5,4.5 L30.5,7 L28,5.5 L25.5,7 L26.5,4.5 L24,3 L27,3
          M36,0 L37,3 L40,3 L37.5,4.5 L38.5,7 L36,5.5 L33.5,7 L34.5,4.5 L32,3 L35,3        
        "
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
};

export default Rating;
