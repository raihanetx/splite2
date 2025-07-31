// Price update functionality
document.addEventListener('DOMContentLoaded', function() {
    const durationSelect = document.getElementById('duration');
    const priceDisplay = document.getElementById('product-price');

    // Update price when duration changes
    durationSelect.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const price = selectedOption.getAttribute('data-price');
        priceDisplay.textContent = '$' + parseFloat(price).toFixed(2);
    });

    // Tab switching functionality
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));

            // Add active class to clicked tab
            this.classList.add('active');

            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });

            // Show corresponding content
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Show third product on desktop
    if (window.innerWidth >= 768) {
        const desktopOnlyCard = document.querySelector('.desktop-only');
        const desktopOnlyLink = desktopOnlyCard ? desktopOnlyCard.parentElement : null;
        if (desktopOnlyLink) {
            // We need to show the parent link, not just the card div
            desktopOnlyLink.style.display = 'block';
        }
    }

    // Star rating functionality - prevents temporary right-side highlight
    const starInputs = document.querySelectorAll('.star-rating input');
    starInputs.forEach(input => {
        input.addEventListener('mousedown', function(e) {
            e.preventDefault();
        });
    });
});

// Description toggle functions
function toggleDescription() {
    const truncated = document.getElementById('description-truncated');
    const full = document.getElementById('description-full');
    const toggle = document.getElementById('description-toggle');

    if (truncated.style.display === 'none') {
        truncated.style.display = 'block';
        full.style.display = 'none';
        toggle.textContent = 'See More';
    } else {
        truncated.style.display = 'none';
        full.style.display = 'block';
        toggle.textContent = 'See Less';
    }
}

// Reviews toggle functions
function toggleReviews() {
    const truncated = document.getElementById('reviews-truncated');
    const full = document.getElementById('reviews-full');
    const toggle = document.getElementById('reviews-toggle');

    if (truncated.style.display === 'none') {
        truncated.style.display = 'block';
        full.style.display = 'none';
        toggle.textContent = 'See More';
    } else {
        truncated.style.display = 'none';
        full.style.display = 'block';
        toggle.textContent = 'See Less';
    }
}
