document.addEventListener('DOMContentLoaded', () => {
    // Only run this script if the overview panel is on the page
    if (document.getElementById('overview-panel')) {
        loadOverviewData();
    }
});

async function loadOverviewData() {
    try {
        const response = await fetch('/api/overview-data');
        if (!response.ok) {
            throw new Error('Failed to fetch overview data');
        }
        const data = await response.json();

        // Populate the UI elements with the fetched data
        populateKPIs(data.kpis);
        renderDailyReportsChart(data.dailyReports);

    } catch (error) {
        console.error("Error loading overview data:", error);
        // You can add an error message to the dashboard here if needed
    }
}

function populateKPIs(kpis) {
        document.getElementById('total-cases-count').textContent = kpis.totalCases;
    document.getElementById('total-lost-count').textContent = kpis.lost;
    document.getElementById('total-found-count').textContent = kpis.found;
    document.getElementById('total-resolved-count').textContent = kpis.resolved;
    document.getElementById('total-staff-count').textContent = kpis.staff;
}

function renderDailyReportsChart(dailyReports) {
    const ctx = document.getElementById('reports-by-day-chart').getContext('2d');
    
    // Format the data for Chart.js
    const labels = dailyReports.map(item => new Date(item._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const data = dailyReports.map(item => item.count);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Reports Filed',
                data: data,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                fill: true,
                tension: 0.3,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
        }
    });
}

function renderAgeBreakdownChart(ageBreakdown) {
    const ctx = document.getElementById('age-breakdown-chart').getContext('2d');

    // Manually create labels for the age buckets
    const labels = ageBreakdown.map(bucket => {
        if (bucket._id === 0) return '0-17 (Minor)';
        if (bucket._id === 18) return '18-40';
        if (bucket._id === 41) return '41-60';
        if (bucket._id === 61) return '61+';
        return 'Other';
    });
    const data = ageBreakdown.map(bucket => bucket.count);

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Age Group',
                data: data,
                backgroundColor: ['#3b82f6', '#16a34a', '#f97316', '#dc2626', '#6b7280'],
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
        }
    });
}