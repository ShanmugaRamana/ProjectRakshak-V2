document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.notification-actions button').forEach(button => {
        button.addEventListener('click', handleAction);
    });
});

async function handleAction(event) {
    const button = event.target;
    // Get both the person's ID and the specific notification's ID from the button
    const { id, notificationId } = button.dataset;
    const action = button.classList.contains('btn-accept') ? 'accept' : 'research';
    const card = button.closest('.notification-card');
    const actionsDiv = card.querySelector('.notification-actions');
    
    actionsDiv.innerHTML = `<p style="color: #0056b3;">Processing...</p>`;

    try {
        // Send the request to the existing action route
        const response = await fetch(`/persons/api/person/${id}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, notificationId })
        });

        if (!response.ok) {
            throw new Error('Server responded with an error.');
        }

        const result = await response.json();
        
        // Give visual feedback and fade out the card
        card.style.opacity = '0.5';
        if (action === 'accept') {
            actionsDiv.innerHTML = `<p style="color: #28a745; font-weight: bold;">Accepted. Status updated.</p>`;
        } else {
            actionsDiv.innerHTML = `<p style="color: #6c757d; font-weight: bold;">Re-Search initiated.</p>`;
        }

    } catch (err) {
        console.error("Action failed:", err);
        actionsDiv.innerHTML = `<p style="color: red;">Action failed. Please try again.</p>`;
    }
}