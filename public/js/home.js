/**
 * SealVo - Home Page Interactions
 * This file handles all the interactive elements on the home page
 * Enhanced for maximum fluidity and smoothness
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize animations and interactions
    initWordCards();
    animateCounters();
    setupScrollEffects();
    initStaggeredAnimations();
    addMouseFollowEffect();
});

/**
 * Animates number counters when they come into view
 * Enhanced with smoother counting animation
 */
function animateCounters() {
    const counters = document.querySelectorAll('.counter-number');
    if (!counters.length) return;
    
    const options = {
        threshold: 0.2,
        rootMargin: "-50px"
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = parseInt(counter.getAttribute('data-count'));
                const currentText = counter.textContent;
                const currentValue = parseInt(currentText.replace(/\D/g, '')) || 0;
                
                if (currentValue < target) {
                    // Enhanced easing function for smoother counting
                    animateValueWithEasing(counter, currentValue, target, 2000);
                }
                
                observer.unobserve(counter);
            }
        });
    }, options);
    
    counters.forEach(counter => {
        observer.observe(counter);
    });
}

/**
 * Animates a value with easing for fluid counting
 */
function animateValueWithEasing(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        
        // Cubic easing function for smoother animation
        const easeProgress = cubicEaseOut(progress);
        const current = Math.floor(start + (end - start) * easeProgress);
        
        element.textContent = current + '+';
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            element.textContent = end + '+';
        }
    };
    
    window.requestAnimationFrame(step);
}

/**
 * Cubic ease out function for smoother animations
 */
function cubicEaseOut(t) {
    return 1 - Math.pow(1 - t, 3);
}

/**
 * Sets up the interactive word cards with fluid rotations
 */
function initWordCards() {
    const wordCards = document.querySelectorAll('.word-card');
    
    wordCards.forEach(card => {
        // Add perspective to parent for better 3D effect
        if (card.parentElement) {
            card.parentElement.style.perspective = '1000px';
        }
        
        // Smooth 3D rotation effect based on mouse position
        card.addEventListener('mousemove', (e) => {
            if (!card.classList.contains('flipping')) {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const rotateX = (y - centerY) / 10;
                const rotateY = (centerX - x) / 10;
                
                card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            }
        });
        
        // Reset rotation on mouse leave
        card.addEventListener('mouseleave', () => {
            if (!card.classList.contains('flipping')) {
                card.style.transition = 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
                card.style.transform = 'rotateX(0) rotateY(0)';
                
                setTimeout(() => {
                    card.style.transition = '';
                }, 800);
            }
        });
        
        // Full flip on click
        card.addEventListener('click', () => {
            card.classList.add('flipping');
            
            if (card.style.transform.includes('rotateY(180deg)')) {
                card.style.transform = 'rotateY(0deg)';
            } else {
                card.style.transform = 'rotateY(180deg)';
            }
            
            setTimeout(() => {
                card.classList.remove('flipping');
            }, 1000);
        });
    });
}

/**
 * Sets up scroll-based animations and effects with enhanced timing
 */
function setupScrollEffects() {
    const sections = document.querySelectorAll('section');
    const fadeElements = document.querySelectorAll('.fade-up');
    const staggerElements = document.querySelectorAll('.stagger-children');
    
    const options = {
        threshold: 0.15,
        rootMargin: "-50px 0px"
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Add animate-in class with slight delay for sequential animation
                setTimeout(() => {
                    entry.target.classList.add('animate-in');
                }, 100);
                
                observer.unobserve(entry.target);
            }
        });
    }, options);
    
    // Observe sections for scroll-based animations
    sections.forEach((section, index) => {
        // Slight delay for each section to create cascade effect
        setTimeout(() => {
            observer.observe(section);
        }, index * 100);
    });
    
    // Animate fade-up elements
    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                fadeObserver.unobserve(entry.target);
            }
        });
    }, options);
    
    fadeElements.forEach(element => {
        fadeObserver.observe(element);
    });
    
    // Animate staggered elements
    const staggerObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                staggerObserver.unobserve(entry.target);
            }
        });
    }, options);
    
    staggerElements.forEach(element => {
        staggerObserver.observe(element);
    });
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (!targetElement) return;
            
            const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
            const startPosition = window.pageYOffset;
            const distance = targetPosition - startPosition;
            
            // Custom smooth scroll with easing
            smoothScrollWithEasing(distance, 800);
        });
    });
}

/**
 * Custom smooth scroll with easing function
 */
function smoothScrollWithEasing(distance, duration) {
    const startTime = performance.now();
    
    function scrollStep(timestamp) {
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease in-out cubic function for smooth scrolling
        const easing = progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        
        window.scrollTo(0, window.pageYOffset + distance * easing);
        
        if (elapsed < duration) {
            window.requestAnimationFrame(scrollStep);
        }
    }
    
    window.requestAnimationFrame(scrollStep);
}

/**
 * Enhanced parallax effect with smoother motion
 */


/**
 * Initialize staggered animations for list items
 */
function initStaggeredAnimations() {
    // Add staggered animation to features section
    const featureCards = document.querySelectorAll('.feature-card');
    const featureGrid = document.querySelector('.feature-grid');
    
    if (featureGrid && featureCards.length) {
        featureGrid.classList.add('stagger-children');
        
        // Add animation classes to children
        featureCards.forEach((card, index) => {
            card.style.transitionDelay = `${0.1 + (index * 0.1)}s`;
        });
    }
    
    // Add staggered animation to testimonials
    const testimonials = document.querySelectorAll('.testimonial');
    const testimonialContainer = document.querySelector('.testimonial-carousel');
    
    if (testimonialContainer && testimonials.length) {
        testimonialContainer.classList.add('stagger-children');
        
        // Add animation classes to children
        testimonials.forEach((testimonial, index) => {
            testimonial.style.transitionDelay = `${0.2 + (index * 0.15)}s`;
        });
    }
}

/**
 * Adds subtle mouse-follow effect to enhance interactivity
 */
function addMouseFollowEffect() {
    const heroSection = document.querySelector('.hero-banner');
    if (!heroSection) return;
    
    // Create a subtle following glow
    const glow = document.createElement('div');
    glow.classList.add('mouse-glow');
    glow.style.cssText = `
        position: absolute;
        width: 300px;
        height: 300px;
        background: radial-gradient(circle, rgba(106, 17, 203, 0.1), rgba(37, 117, 252, 0.05), transparent 70%);
        border-radius: 50%;
        pointer-events: none;
        transform: translate(-50%, -50%);
        z-index: 0;
        opacity: 0;
        transition: opacity 0.5s ease;
    `;
    
    heroSection.appendChild(glow);
    
    // Smooth follow with lerping for fluid motion
    let mouseX = 0;
    let mouseY = 0;
    let glowX = 0;
    let glowY = 0;
    
    heroSection.addEventListener('mousemove', (e) => {
        const rect = heroSection.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
        
        if (glow.style.opacity === '0') {
            glow.style.opacity = '1';
        }
    });
    
    heroSection.addEventListener('mouseleave', () => {
        glow.style.opacity = '0';
    });
    
    // Use requestAnimationFrame for smooth animation
    function animateGlow() {
        // Lerp for smooth movement
        glowX += (mouseX - glowX) * 0.1;
        glowY += (mouseY - glowY) * 0.1;
        
        glow.style.left = `${glowX}px`;
        glow.style.top = `${glowY}px`;
        
        requestAnimationFrame(animateGlow);
    }
    
    animateGlow();
}

// Helper for applying class to elements with delay
function applyWithDelay(elements, className, baseDelay = 100, increment = 100) {
    elements.forEach((element, index) => {
        setTimeout(() => {
            element.classList.add(className);
        }, baseDelay + (index * increment));
    });
} 