/* ==== CONFIG ==== */
const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfmJ4aMSEYq-sT6aLl288_8KmgRVkV3stg-Qlpbcx-MKQtR6A/formResponse";
const SHEET_URL = "https://docs.google.com/spreadsheets/d/1XXYosjOR4jTpBOlUFwPn2l3vhnemOh5REtoMXqW-ymU/gviz/tq?tqx=out:json&gid=631160791";

// ==== CUSTOM ICONS ====
const pumpkinIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/992/992703.png',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38]
});

const selectedIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -28]
});

// ==== MAIN CODE ====
document.addEventListener("DOMContentLoaded", () => {
  // Drawer toggle
  const toggleBtn = document.getElementById('drawerToggle');
  const drawer = document.getElementById('drawer');

  toggleBtn.addEventListener('click', () => {
    drawer.classList.toggle('open');
    toggleBtn.textContent = drawer.classList.contains('open')
      ? '✖ Close'
      : 'Submit a New House!';
  });

  // Initialize map
  const map = L.map('map').setView([39.5, -98.35], 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
  }).addTo(map);

  let marker = null;
  map.on('click', e => {
    if (marker) map.removeLayer(marker);
    marker = L.marker(e.latlng, { icon: selectedIcon }).addTo(map);
    marker.bindPopup("🎃 Selected location").openPopup();
  });

  // Load approved pins
  async function loadApprovedPins() {
    try {
      const response = await fetch(SHEET_URL);
      const text = await response.text();
      const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
      if (!match) throw new Error("Invalid Google Sheets response format");
      const data = JSON.parse(match[1]);
      const rows = data.table.rows;

      rows.forEach(row => {
        const name = row.c[1]?.v || "";
        const description = row.c[2]?.v || "";
        const address = row.c[3]?.v || "";
        const lat = row.c[4]?.v ? parseFloat(row.c[4].v) : null;
        const lng = row.c[5]?.v ? parseFloat(row.c[5].v) : null;

        if (lat && lng) {
          L.marker([lat, lng], { icon: pumpkinIcon }).addTo(map)
            .bindPopup(`<b>${description}</b><br>${address}<br>Submitted by: ${name}`);
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

      drawer.classList.remove('open');
      toggleBtn.textContent = 'Submit a New House!';
    } catch (err) {
      console.error("Submission failed:", err);
      alert("Error connecting to Google Form.");
    }
  });
});
