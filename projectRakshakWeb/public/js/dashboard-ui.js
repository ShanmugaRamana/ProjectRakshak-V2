document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements ---
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
    const contentPanels = document.querySelectorAll('.content-panel');
    const dashboardContainer = document.getElementById('dashboard-container');
    const toggleButtons = document.querySelectorAll('.sidebar-toggle-btn'); 
    const alertButton = document.getElementById('alert-button');
    const notificationCountSpan = document.getElementById('notification-count');

    const showGroundStaffFormBtn = document.getElementById('show-ground-staff-form');
    const groundStaffForm = document.getElementById('ground-staff-form-container');
    let notificationCount = 0;

    // --- Sidebar & Tab Logic ---
    if (toggleButtons.length > 0 && dashboardContainer) {
        toggleButtons.forEach(button => {
            button.addEventListener('click', () => {
                dashboardContainer.classList.toggle('sidebar-collapsed');
            });
        });
    }

    function switchTab(targetId) {
        contentPanels.forEach(panel => {
            panel.classList.remove('active');
        });
        navLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        const targetPanel = document.getElementById(targetId);
        const targetLink = document.querySelector(`[data-target="${targetId}"]`);
        if (targetPanel) targetPanel.classList.add('active');
        if (targetLink) targetLink.classList.add('active');
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            switchTab(targetId);
            history.replaceState(null, null, `#${targetId.replace('-panel', '')}`);
        });
    });
if (showGroundStaffFormBtn && groundStaffForm) {
        showGroundStaffFormBtn.addEventListener('click', () => {
            // When the button is clicked, change the form's display style from 'none' to 'block'.
            groundStaffForm.style.display = 'block';
        });
    }
    const currentHash = window.location.hash.substring(1);
    if (currentHash) {
        switchTab(`${currentHash}-panel`);
    } else {
        switchTab('lost-and-found-panel');
    }
    
    // --- Enhanced Socket.IO and Alert Button Logic ---
    
    // Check if Socket.IO library loaded successfully
    if (typeof io === 'undefined') {
        console.error("FATAL: Socket.IO client library failed to load. Real-time alerts will not work.");
        return;
    }

    const socket = io();

    // Connection event handlers
    socket.on('connect', () => {
        console.log('Dashboard UI connected to Socket.IO server successfully.');
        // Request current notification count on connect
        socket.emit('request_notification_count');
    });

    socket.on('connect_error', (err) => {
        console.error('Socket.IO connection error:', err.message);
    });

    socket.on('disconnect', () => {
        console.log('Dashboard UI disconnected from Socket.IO server.');
    });

    // --- FIXED: Handle both notification events ---
    
    // Listen for new match notifications
    socket.on('new_match_found', (data) => {
        console.log('New match notification received by UI:', data);
        notificationCount++;
        updateNotificationUI();
        
        // Show a brief toast notification
        showToast(`New match found: ${data.personName}`, 'info');
    });

    // Listen for person found confirmations
    socket.on('person_found', (data) => {
        console.log('Person found confirmation received by UI:', data);
        
        // Show success notification
        showToast(`${data.fullName} has been found!`, 'success');
        
        // Refresh the person list if we're on the lost-and-found panel
        const currentPanel = document.querySelector('.content-panel.active');
        if (currentPanel && currentPanel.id === 'lost-and-found-panel') {
            // Optionally reload the page or update the list dynamically
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }
    });

    // Handle notification count updates from server
    socket.on('notification_count_update', (count) => {
        notificationCount = count;
        updateNotificationUI();
    });

    // Function to update notification UI elements
    function updateNotificationUI() {
        if (notificationCount > 0) {
            notificationCountSpan.textContent = notificationCount;
            notificationCountSpan.style.display = 'flex';
            alertButton.classList.add('blinking');
        } else {
            notificationCountSpan.style.display = 'none';
            alertButton.classList.remove('blinking');
        }
    }

    // Alert button click handler
    if (alertButton) {
        alertButton.addEventListener('click', () => {
            window.open('/notifications', '_blank');
            // Reset notification count locally
            notificationCount = 0;
            updateNotificationUI();
            
            // Notify server to reset count
            socket.emit('reset_notification_count');
        });
    }

    // --- Toast Notification System ---
    function showToast(message, type = 'info') {
        // Remove existing toast if present
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }

        // Create new toast
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-message">${message}</span>
                <button class="toast-close">&times;</button>
            </div>
        `;

        // Add to page
        document.body.appendChild(toast);

        // Show toast
        setTimeout(() => {
            toast.classList.add('toast-show');
        }, 100);

        // Auto-hide after 5 seconds
        const autoHide = setTimeout(() => {
            hideToast(toast);
        }, 5000);

        // Manual close handler
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            clearTimeout(autoHide);
            hideToast(toast);
        });
    }

    function hideToast(toast) {
        toast.classList.remove('toast-show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    // --- Enhanced Error Handling ---
    
    // Handle potential errors from the server
    socket.on('error', (error) => {
        console.error('Socket.IO server error:', error);
        showToast('Connection error. Some features may not work properly.', 'error');
    });

    // Reconnection logic
    socket.on('reconnect', (attemptNumber) => {
        console.log(`Reconnected to server after ${attemptNumber} attempts`);
        showToast('Connection restored', 'success');
        // Re-request notification count after reconnection
        socket.emit('request_notification_count');
    });

    socket.on('reconnect_error', (error) => {
        console.error('Failed to reconnect:', error);
        showToast('Unable to reconnect to server', 'error');
    });

    // --- Initial Setup ---
    updateNotificationUI();
});