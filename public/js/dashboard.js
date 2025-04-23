/**
 * Dashboard.js
 * Interactive functionality for the dashboard page
 */

document.addEventListener('DOMContentLoaded', function() {
    initDashboard();
    initMouseTracker();
    initProgressBars();
    initActionCards();
    initStreakAnimation();
    addClickEffects();
});

/**
 * Initialize the dashboard components
 */
function initDashboard() {
    console.log('Dashboard initialized');
    
    // Show welcome message with typewriter effect
    const welcomeElement = document.querySelector('.dashboard-welcome');
    if (welcomeElement) {
        const text = welcomeElement.textContent;
        welcomeElement.textContent = '';
        let i = 0;
        
        function typeWriter() {
            if (i < text.length) {
                welcomeElement.textContent += text.charAt(i);
                i++;
                setTimeout(typeWriter, 50);
            }
        }
        
        setTimeout(typeWriter, 500);
    }
}

/**
 * Create a mouse tracker effect that follows the cursor
 */
function initMouseTracker() {
    const tracker = document.createElement('div');
    tracker.className = 'mouse-tracker';
    document.body.appendChild(tracker);
    
    document.addEventListener('mousemove', e => {
        tracker.style.opacity = '1';
        tracker.style.left = `${e.clientX}px`;
        tracker.style.top = `${e.clientY}px`;
        
        // Hide the tracker when not moving
        clearTimeout(window.mouseTimer);
        window.mouseTimer = setTimeout(() => {
            tracker.style.opacity = '0';
        }, 1000);
    });
    
    // Hide tracker when leaving the window
    document.addEventListener('mouseleave', () => {
        tracker.style.opacity = '0';
    });
}

/**
 * Initialize all progress bars with animation
 */
function initProgressBars() {
    const progressBars = document.querySelectorAll('.progress-bar-fill');
    
    progressBars.forEach(bar => {
        const targetWidth = bar.getAttribute('data-width') || '0';
        
        // Use Intersection Observer to trigger animation when visible
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        bar.style.width = `${targetWidth}%`;
                    }, 300);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        
        observer.observe(bar);
    });
    
    // Update progress text
    const progressPercentage = document.getElementById('progress-percentage');
    if (progressPercentage) {
        const progressBar = document.querySelector('.progress-bar-fill');
        const targetWidth = progressBar ? (progressBar.getAttribute('data-width') || '0') : '0';
        
        let currentWidth = 0;
        const interval = setInterval(() => {
            if (currentWidth >= parseInt(targetWidth)) {
                clearInterval(interval);
            } else {
                currentWidth++;
                progressPercentage.textContent = `${currentWidth}%`;
            }
        }, 20);
    }
}

/**
 * Add hover and click effects to action cards
 */
function initActionCards() {
    const actionCards = document.querySelectorAll('.action-card');
    
    actionCards.forEach(card => {
        // Tilt effect on mouse move
        card.addEventListener('mousemove', e => {
            const cardRect = card.getBoundingClientRect();
            const cardCenterX = cardRect.left + cardRect.width / 2;
            const cardCenterY = cardRect.top + cardRect.height / 2;
            const mouseX = e.clientX - cardCenterX;
            const mouseY = e.clientY - cardCenterY;
            
            const maxRotation = 8;
            const rotateY = maxRotation * mouseX / (cardRect.width / 2);
            const rotateX = -maxRotation * mouseY / (cardRect.height / 2);
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
        
        // Reset transform on mouse leave
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
            setTimeout(() => {
                card.style.transform = '';
            }, 300);
        });
    });
}

/**
 * Add animation to streak display
 */
function initStreakAnimation() {
    const streakDays = document.querySelectorAll('.streak-day');
    
    streakDays.forEach((day, index) => {
        setTimeout(() => {
            if (day.classList.contains('active')) {
                day.classList.add('pulse-animation');
            }
        }, 300 * (index + 1));
    });
}

/**
 * Add wave effect on click
 */
function addClickEffects() {
    document.addEventListener('click', function(e) {
        // Create wave effect
        const wave = document.createElement('div');
        wave.className = 'wave-effect';
        wave.style.left = `${e.clientX}px`;
        wave.style.top = `${e.clientY}px`;
        document.body.appendChild(wave);
        
        // Remove after animation completes
        setTimeout(() => {
            document.body.removeChild(wave);
        }, 1000);
        
        // Add pulse animation to buttons
        if (e.target.closest('button, .dashboard-btn')) {
            const button = e.target.closest('button, .dashboard-btn');
            button.classList.add('pulse-animation');
            setTimeout(() => {
                button.classList.remove('pulse-animation');
            }, 300);
        }
    });
    
    // Stat cards hover effect
    const statItems = document.querySelectorAll('.stat-item');
    statItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            const numberEl = item.querySelector('.stat-number');
            if (numberEl) {
                numberEl.classList.add('hover-effect');
            }
        });
        
        item.addEventListener('mouseleave', () => {
            const numberEl = item.querySelector('.stat-number');
            if (numberEl) {
                numberEl.classList.remove('hover-effect');
            }
        });
    });
}

/**
 * Update statistics counters with animation
 */
function animateCounter(element, target) {
    const duration = 1500;
    const frameDuration = 1000 / 60;
    const totalFrames = Math.round(duration / frameDuration);
    let frame = 0;
    const counter = { count: 0 };
    
    const animate = () => {
        frame++;
        const progress = frame / totalFrames;
        const currentCount = Math.round(counter.count);
        
        if (progress < 1) {
            counter.count = target * easeOutQuad(progress);
            element.textContent = currentCount;
            requestAnimationFrame(animate);
        } else {
            counter.count = target;
            element.textContent = target;
        }
    };
    
    requestAnimationFrame(animate);
}

/**
 * Easing function
 */
function easeOutQuad(x) {
    return 1 - (1 - x) * (1 - x);
}