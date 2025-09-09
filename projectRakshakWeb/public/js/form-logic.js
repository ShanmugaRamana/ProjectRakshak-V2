document.addEventListener('DOMContentLoaded', () => {
    const ageInput = document.getElementById('age');
    if (ageInput) {
        // Add listener to the age input field
        ageInput.addEventListener('input', handleAgeChange);
        // Call it once on load in case the form is re-populated with old data
        handleAgeChange();
    }
});

function handleAgeChange() {
    const ageInput = document.getElementById('age');
    const age = parseInt(ageInput.value, 10) || 0;

    const guardianSection = document.getElementById('guardian-section');
    const personContactInput = document.getElementById('personContactNumber');

    // Show/hide guardian section for minors (age 1-17)
    if (age > 0 && age < 18) {
        guardianSection.style.display = 'block';
        guardianSection.querySelectorAll('input, select').forEach(input => input.required = true);
        personContactInput.required = false;
    } else {
        guardianSection.style.display = 'none';
        guardianSection.querySelectorAll('input, select').forEach(input => input.required = false);
        // Make the person's contact number required only for adults (18+)
        personContactInput.required = (age >= 18);
    }
}