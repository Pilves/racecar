document.addEventListener("DOMContentLoaded", () => {
    const socket = io();
    const flagDisplay = document.getElementById("flagDisplay");
  
    // Update flag status in real-time
    socket.on("updateFlag", (flag) => {
      flagDisplay.className = `flag-${flag.toLowerCase()}`;
    });
  });
  