document.addEventListener('DOMContentLoaded', () => {
    const personItems = document.querySelectorAll('.person-item');
    const detailsView = document.getElementById('details-view');

    personItems.forEach(item => {
        item.addEventListener('click', () => {
            // Highlight the selected item
            personItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            const personId = item.dataset.id;
            fetchAndDisplayPersonDetails(personId, detailsView);
        });
    });
});

async function fetchAndDisplayPersonDetails(id, container) {
    try {
        container.innerHTML = `<p class="details-placeholder">Loading...</p>`;
        const response = await fetch(`/api/person/${id}`);
        if (!response.ok) {
            throw new Error('Failed to fetch details.');
        }
        const person = await response.json();
        renderPersonDetails(person, container);
    } catch (error) {
        console.error('Error fetching details:', error);
        container.innerHTML = `<p class="error-message">Could not load details.</p>`;
    }
}

function renderPersonDetails(person, container) {
    // Generate HTML for all registered images
    const imagesHtml = person.images.map(img => `<img src="${img.url}" alt="Photo of ${person.fullName}">`).join('');

    // Format dates for better readability
    const lastSeenTime = new Date(person.lastSeenTime).toLocaleString();
    const createdAt = new Date(person.createdAt).toLocaleString();

    const detailsHtml = `
        <div class="details-content">
            <h2>${person.fullName} <span class="details-status status-${person.status.toLowerCase()}">${person.status}</span></h2>
            
            <section class="details-section">
                <h4>Lost Person Details</h4>
                <div class="details-grid">
                    <div class="detail-item"><strong>Age</strong><span>${person.age}</span></div>
                    <div class="detail-item"><strong>Contact</strong><span>${person.personContactNumber || 'N/A'}</span></div>
                    <div class="detail-item full-width"><strong>Last Seen Location</strong><span>${person.lastSeenLocation}</span></div>
                    <div class="detail-item full-width"><strong>Last Seen Time</strong><span>${lastSeenTime}</span></div>
                </div>
                <h5>Identification Details</h5>
                <p>${person.identificationDetails}</p>
            </section>
            
            <section class="details-section">
                <h4>Reporter Details</h4>
                <div class="details-grid">
                    <div class="detail-item"><strong>Name</strong><span>${person.reporterName}</span></div>
                    <div class="detail-item"><strong>Relation</strong><span>${person.reporterRelation}</span></div>
                    <div class="detail-item full-width"><strong>Contact</strong><span>${person.reporterContactNumber}</span></div>
                </div>
                <p><em>Report filed on: ${createdAt}</em></p>
            </section>

            <section class="details-section">
                <h4>Registered Images</h4>
                <div class="details-images">${imagesHtml}</div>
            </section>
        </div>
    `;
    container.innerHTML = detailsHtml;
}