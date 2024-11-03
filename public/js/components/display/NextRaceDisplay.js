document.addEventListener("DOMContentLoaded", () => {
    const socket = io();
    const nextRaceList = document.getElementById("nextRaceList");
  
    // Load next race session details
    socket.on("nextRaceDetails", (drivers) => {
      nextRaceList.innerHTML = "";
      drivers.forEach((driver) => {
        const listItem = document.createElement("li");
        listItem.textContent = `Driver: ${driver.name}, Car: ${driver.carNumber}`;
        nextRaceList.appendChild(listItem);
      });
    });
  });
  