const FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfmJ4aMSEYq-sT6aLl288_8KmgRVkV3stg-Qlpbcx-MKQtR6A/formResponse";
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1XXYosjOR4jTpBOlUFwPn2l3vhnemOh5REtoMXqW-ymU/gviz/tq?tqx=out:json&gid=631160791";

// Pumpkin icon for approved pins
const pumpkinIcon = L.icon({
  iconUrl: "assets/placeholder.png", // your pumpkin PNG
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Normal red pin for selected location
const selectedIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -28],
});

// Drawer toggle
const drawer = document.getElementById("drawer");
const toggleBtn = document.getElementById("drawerToggle");
toggleBtn.addEventListener("click", () => {
  drawer.classList.toggle("open");
  toggleBtn.textContent = drawer.classList.contains("open")
    ? "✖ Close"
    : "Submit a New House!";
});

// Helper to open drawer programmatically
function openDrawer() {
  drawer.classList.add("open");
  toggleBtn.textContent = "✖ Close";
}

// Init map
const map = L.map("map").setView([39.5, -98.35], 4);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
}).addTo(map);

// User selected marker
let marker = null;
map.on("click", (e) => {
  // Remove previous marker if exists
  if (marker) map.removeLayer(marker);

  // Add marker at clicked location
  marker = L.marker(e.latlng, { icon: selectedIcon }).addTo(map);

  // Flag to ignore programmatic closes
  let ignorePopupClose = false;

  // Create the button element programmatically
  const submitButton = document.createElement("button");
  submitButton.className = "popupSubmitBtn";
  submitButton.style = `
    background-color: orange;
    border: none;
    border-radius: 6px;
    padding: 6px 12px;
    font-weight: bold;
    cursor: pointer;
    color: black;
  `;
  submitButton.textContent = "Submit this location";

  // Attach the event listener to the button directly
  submitButton.addEventListener("click", () => {
    ignorePopupClose = true;   // ignore the next popupclose event
    drawer.classList.add("open");
    toggleBtn.textContent = "✖ Close";
    marker.closePopup();       // programmatic close
  });

  // Create the popup content container
  const popupContainer = document.createElement("div");
  popupContainer.style = "text-align:center;";
  popupContainer.innerHTML =
    "🎯 <strong>Pin placed!</strong><br>Click below to fill out details:<br><br>";
  popupContainer.appendChild(submitButton);

  // Bind and open the popup
  marker.bindPopup(popupContainer).openPopup();

  // Remove marker only if user clicks the X
  marker.on("popupclose", (e) => {
    if (!ignorePopupClose) {
      if (marker) {
        map.removeLayer(marker);
        marker = null;
      }
    } else {
      ignorePopupClose = false; // reset the flag for next time
    }
  });
});

// Create a custom "Locate Me" control
const locateControl = L.Control.extend({
  options: { position: 'bottomright' },

  onAdd: function(map) {
    // Container for the button
    const container = L.DomUtil.create('div', 'leaflet-control leaflet-control-locate');

    // Styles for the circular button with plus
    container.style.width = '40px';
    container.style.height = '40px';
    container.style.borderRadius = '50%';
    container.style.background = 'white';
    container.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    container.style.display = 'flex';
    container.style.justifyContent = 'center';
    container.style.alignItems = 'center';
    container.style.cursor = 'pointer';
    container.title = 'Zoom to my location';
    container.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';

    // Hover effect
    container.onmouseover = () => {
      container.style.transform = 'scale(1.1)';
      container.style.boxShadow = '0 4px 10px rgba(0,0,0,0.4)';
    };
    container.onmouseout = () => {
      container.style.transform = 'scale(1)';
      container.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    };

    // Plus icon (SVG for crisp scaling)
    container.innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24">
        <circle cx="12" cy="12" r="12" fill="orange" fill-opacity="0.8"/>
        <line x1="12" y1="6" x2="12" y2="18" stroke="white" stroke-width="2"/>
        <line x1="6" y1="12" x2="18" y2="12" stroke="white" stroke-width="2"/>
      </svg>
    `;

    // Click behavior
    container.onclick = () => {
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          // Zoom to location
          map.setView([lat, lng], 16);

          // Optional: Add a temporary highlight circle
          const highlight = L.circle([lat, lng], {
            radius: 50,
            color: "orange",
            fillColor: "#ffa500",
            fillOpacity: 0.5,
          }).addTo(map);

          // Remove circle after 3 seconds
          setTimeout(() => map.removeLayer(highlight), 3000);
        },
        () => alert("Unable to retrieve your location")
      );
    };

    return container;
  }
});

// Add control to map
map.addControl(new locateControl());





// Load approved pins
async function loadApprovedPins() {
  try {
    const response = await fetch(SHEET_URL);
    const text = await response.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
    if (!match) throw new Error("Invalid Google Sheets response format");
    const data = JSON.parse(match[1]);
    const rows = data.table.rows;

    rows.forEach((row) => {
      const name = row.c[1]?.v || "";
      const description = row.c[2]?.v || "";
      const address = row.c[3]?.v || "";
      const lat = row.c[4]?.v ? parseFloat(row.c[4].v) : null;
      const lng = row.c[5]?.v ? parseFloat(row.c[5].v) : null;

      if (lat && lng) {
        L.marker([lat, lng], { icon: pumpkinIcon })
          .addTo(map)
          .bindPopup(
            `<b>${description}</b><br>${address}<br>Submitted by: ${name}`
          );
      }
    });
  } catch (err) {
    console.error("Failed to load pins:", err);
  }
}

loadApprovedPins();

// Submit handler
document.getElementById("submitBtn").addEventListener("click", async () => {
  const description = document.getElementById("description").value.trim();
  const submittedBy = document.getElementById("submittedBy").value.trim();
  const address = document.getElementById("address").value.trim();

  if (!description || !submittedBy) {
    alert("Please fill in Description and Your Name.");
    return;
  }
  if (!marker) {
    alert("Drop a pin on the map first!");
    return;
  }

  const lat = marker.getLatLng().lat;
  const lng = marker.getLatLng().lng;

  const formData = new FormData();
  formData.append("entry.871862830", description);
  formData.append("entry.956493276", submittedBy);
  formData.append("entry.1089082775", address);
  formData.append("entry.1905521699", lat);
  formData.append("entry.408058304", lng);

  try {
    await fetch(FORM_URL, { method: "POST", mode: "no-cors", body: formData });
    alert("Location sent! Your selection will be added after approval.");
    document.getElementById("description").value = "";
    document.getElementById("submittedBy").value = "";
    document.getElementById("address").value = "";
    if (marker) map.removeLayer(marker);
    marker = null;
    drawer.classList.remove("open");
    toggleBtn.textContent = "Submit a New House!";
  } catch (err) {
    console.error("Submission failed:", err);
    alert("Error connecting to Google Form.");
  }
});
