document.addEventListener("DOMContentLoaded", () => {
    const raceSessionsTable = document.getElementById("raceSessionsTable");
    const addRaceForm = document.getElementById("addRaceForm");
    const driverNameInput = document.getElementById("driverName");
  
    // Initialize Socket.IO connection
    const socket = io();
  
    // Load initial race sessions
    socket.on("loadSessions", (sessions) => {
      raceSessionsTable.innerHTML = "";
      sessions.forEach((session) => {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${session.driverName}</td><td>${session.carNumber}</td>`;
        raceSessionsTable.appendChild(row);
      });
    });
  
    // Handle form submission to add a new driver
    addRaceForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const driverName = driverNameInput.value.trim();
      if (driverName) {
        socket.emit("addDriver", { driverName });
        driverNameInput.value = "";
      }
    });
  
    // Update the race sessions table in real-time
    socket.on("updateSessions", (sessions) => {
      raceSessionsTable.innerHTML = "";
      sessions.forEach((session) => {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${session.driverName}</td><td>${session.carNumber}</td>`;
        raceSessionsTable.appendChild(row);
      });
    });
  });
  