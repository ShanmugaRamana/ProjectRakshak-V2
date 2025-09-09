document.addEventListener('DOMContentLoaded', () => {
    const mapElement = document.getElementById('map');
    if (mapElement) {
        setTimeout(() => {
            initializeMap(mapElement);
        }, 100);
    }
});

function initializeMap(mapElement) {
    if (mapElement._leaflet_id) return; // Prevent re-initialization

    const templeCoords = [23.1828, 75.7679];
    const map = L.map('map').setView(templeCoords, 17);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    L.marker(templeCoords)
        .addTo(map)
        .bindPopup('<b>Mahakaleshwar Jyotirlinga</b>');

    // --- THIS IS THE UPDATED PART ---
    
    // 1. Get references to the HTML elements we need to change
    const liveFeedImg = document.getElementById('live-feed');
    const feedTitle = document.querySelector('.video-feed-container h3');
    // Get the base URL from the image's initial src attribute
    const backendUrl = liveFeedImg.src.split('/video_feed')[0];

    // 2. Define our camera locations with their corresponding IDs
    const cameraLocations = [
        { lat: 23.1836, lng: 75.7668, name: 'Camera C1 (Default)', id: 0 },
        { lat: 23.1826, lng: 75.7693, name: 'Camera C2 (External)', id: 1 }
    ];

    // 3. Add click listeners to each camera marker
    cameraLocations.forEach(cam => {
        const marker = L.marker([cam.lat, cam.lng])
            .addTo(map)
            .bindPopup(`<b>${cam.name}</b>`);

        marker.on('click', () => {
            console.log(`Switching to ${cam.name}`);
            // Update the image source to the clicked camera's stream
            liveFeedImg.src = `${backendUrl}/video_feed/${cam.id}`;
            // Update the title
            feedTitle.textContent = `Live Monitoring Feed: ${cam.name}`;
        });
    });
}
