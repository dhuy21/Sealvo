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
    initAvatarEdit();
    initProfileEdit();
});

document.querySelectorAll('.edit-btn').forEach(button => {
    button.addEventListener('click', handleEditClick);
}); 

document.getElementById('changePasswordBtn').addEventListener('click', function() {
    // Send a POST request to change the password
    fetch('/dashboard/changePassword', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Un message a été envoyé pour réinitialiser votre mot de passe', 'success');
        } else {
            showNotification('Erreur lors du changement de mot de passe: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Erreur lors de la requête:', error);
    });
});

/**
 * Initialize the dashboard components
 */
function initDashboard() {
    console.log('Dashboard initialized');
    
    // Show welcome message with typewriter effect
    const welcomeElement = document.querySelector('.dashboard-welcome');
    if (welcomeElement) {
        const username = welcomeElement.getAttribute('data-user');
        
        // First, render the HTML structure
        welcomeElement.innerHTML = `
            <i class="fas fa-hand-sparkles" style="color: #FFCC70; margin-right: 0.5rem;"></i>
            Bienvenue <span style="font-weight: 700; color: var(--primary-color);">${username}</span>, 
            <span class="typing-text"></span>
        `;
        
        // Then animate only the text part
        const textToType = "voici le résumé de votre progression en vocabulaire.";
        const typingElement = welcomeElement.querySelector('.typing-text');
        let i = 0;
        
        function typeWriter() {
            if (i < textToType.length) {
                typingElement.textContent += textToType.charAt(i);
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

/**
 * Initialize edit buttons for profile information
 */
function initProfileEdit() {
    document.querySelectorAll('.info-value .edit-btn').forEach(button => {
        button.addEventListener('click', handleEditClick);
    });
}

function handleEditClick(e) {
    e.preventDefault();
    const infoRow = this.closest('.info-row');
    const info = this.closest('.info-value');
    const displaySpan = info.querySelector('.username-display') || info.querySelector('.email-display');
    
    if (!displaySpan) return; // Not an editable field
    
    const originalValue = displaySpan.textContent.trim();
    
    // Store the original HTML to restore it on cancel
    info.dataset.originalHtml = info.innerHTML;
    
    // Replace content with edit form
    info.innerHTML = `<input type="text" class="edit-input" value="${originalValue}">
    <button class="save-btn" title="Valider">
        <i class="fas fa-check"></i>
    </button>
    <button class="cancel-btn" title="Annuler">
        <i class="fas fa-times"></i>
    </button>
    `;
    
    // Focus the input field
    const input = info.querySelector('.edit-input');
    input.focus();
    input.setSelectionRange(0, input.value.length);
    
    const saveBtn = info.querySelector('.save-btn');
    const cancelBtn = info.querySelector('.cancel-btn');

    saveBtn.addEventListener('click', handleSaveClick);
    cancelBtn.addEventListener('click', handleCancelClick);

    // Add keyboard events
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            saveBtn.click();
        } else if (e.key === 'Escape') {
            cancelBtn.click();
        }
    });
}

function handleSaveClick(e) {
    e.preventDefault();
    const infoRow = this.closest('.info-row');
    const info = this.closest('.info-value');
    const input = info.querySelector('.edit-input');
    const displaySpanClass = infoRow.querySelector('.info-label i').className.includes('user-tag') 
        ? 'username-display' 
        : 'email-display';
    const originalValue = info.dataset.originalHtml 
        ? (info.dataset.originalHtml.match(new RegExp(`<span class="${displaySpanClass}">(.*?)</span>`)) || [])[1] 
        : '';
    const newValue = input.value.trim();
    
    // Determine which field we're editing based on the parent info-row
    const fieldType = infoRow.querySelector('.info-label i').className;
    let fieldName;
    
    if (fieldType.includes('user-tag')) {
        fieldName = 'username';
    } else if (fieldType.includes('envelope')) {
        fieldName = 'email';
    } else {
        fieldName = 'username'; // Default to username if we can't determine
    }

    if (newValue !== originalValue) {
        fetch(`/dashboard/edit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ [fieldName]: newValue })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Get the original HTML and replace the content inside the span
                if (info.dataset.originalHtml) {
                    const originalHtml = info.dataset.originalHtml;
                    const updatedHtml = originalHtml.replace(
                        new RegExp(`<span class="${displaySpanClass}">.*?</span>`),
                        `<span class="${displaySpanClass}">${newValue}</span>`
                    );
                    info.innerHTML = updatedHtml;
                    
                    // Reattach event listener to the edit button
                    const editBtn = info.querySelector('.edit-btn');
                    if (editBtn) {
                        editBtn.addEventListener('click', handleEditClick);
                    }
                    
                    // Update the dashboard welcome if username was changed
                    if (fieldName === 'username') {
                        const welcomeElement = document.querySelector('.dashboard-welcome');
                        if (welcomeElement) {
                            welcomeElement.setAttribute('data-user', newValue);
                            initDashboard(); // Reinitialize dashboard with new username
                        }
                    }
                    
                    // Remove the original HTML data attribute
                    delete info.dataset.originalHtml;
                }
            } else {
                alert('Erreur lors de la modification: ' + data.message);
                // Restore original HTML on error
                if (info.dataset.originalHtml) {
                    info.innerHTML = info.dataset.originalHtml;
                    
                    // Reattach event listener to the edit button
                    const editBtn = info.querySelector('.edit-btn');
                    if (editBtn) {
                        editBtn.addEventListener('click', handleEditClick);
                    }
                    
                    delete info.dataset.originalHtml;
                }
            }
        })
        .catch(error => {
            console.error('Erreur lors de la modification:', error);
            // Restore original HTML on error
            if (info.dataset.originalHtml) {
                info.innerHTML = info.dataset.originalHtml;
                
                // Reattach event listener to the edit button
                const editBtn = info.querySelector('.edit-btn');
                if (editBtn) {
                    editBtn.addEventListener('click', handleEditClick);
                }
                
                delete info.dataset.originalHtml;
            }
        });
    } else {
        // If no change, just restore the original HTML
        if (info.dataset.originalHtml) {
            info.innerHTML = info.dataset.originalHtml;
            
            // Reattach event listener to the edit button
            const editBtn = info.querySelector('.edit-btn');
            if (editBtn) {
                editBtn.addEventListener('click', handleEditClick);
            }
            
            delete info.dataset.originalHtml;
        }
    }
}

function handleCancelClick(e) {
    e.preventDefault();
    const info = this.closest('.info-value');
    
    // Restore the original HTML content
    if (info.dataset.originalHtml) {
        info.innerHTML = info.dataset.originalHtml;
        
        // Reattach event listener to the edit button
        const editBtn = info.querySelector('.edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', handleEditClick);
        }
        
        // Remove the original HTML data attribute
        delete info.dataset.originalHtml;
    }
}

/**
 * Initialize avatar edit functionality
 */
function initAvatarEdit() {
    const avatarEditBtn = document.querySelector('.edit-btn-avatar');
    const avatarModal = document.getElementById('avatarModal');
    const closeBtn = document.querySelector('.avatar-modal-close');
    const saveBtn = document.getElementById('saveAvatarBtn');
    const cancelBtn = document.getElementById('cancelAvatarBtn');
    const avatarOptions = document.querySelectorAll('.avatar-option');
    
    let selectedAvatar = null;
    
    // Open modal when edit button is clicked
    if (avatarEditBtn) {
        avatarEditBtn.addEventListener('click', function() {
            // Make modal visible but transparent
            avatarModal.style.display = 'block';
            
            // Force browser to recognize the display change before changing opacity
            setTimeout(() => {
                avatarModal.style.opacity = '1';
            }, 10);
            
            // Fix body scrolling
            document.body.style.overflow = 'hidden';
            
            // Find currently selected avatar
            document.querySelectorAll('.avatar-option').forEach(option => {
                if (option.querySelector('.avatar-selected')) {
                    selectedAvatar = option.getAttribute('data-avatar');
                    option.classList.add('selected');
                }
            });
        });
    }
    
    // Close modal when X is clicked
    if (closeBtn) {
        closeBtn.addEventListener('click', closeAvatarModal);
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === avatarModal) {
            closeAvatarModal();
        }
    });
    
    // Handle escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && avatarModal.style.display === 'block') {
            closeAvatarModal();
        }
    });
    
    // Close modal function
    function closeAvatarModal() {
        avatarModal.style.opacity = '0';
        
        // Re-enable body scrolling
        document.body.style.overflow = '';
        
        // Wait for opacity transition to complete before hiding the modal
        setTimeout(() => {
            avatarModal.style.display = 'none';
        }, 300);
    }
    
    // Handle avatar selection
    avatarOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Add visual feedback
            option.classList.add('pulse-animation');
            setTimeout(() => {
                option.classList.remove('pulse-animation');
            }, 300);
            
            // Remove selected class and checkmark from all options
            avatarOptions.forEach(opt => {
                opt.classList.remove('selected');
                const checkmark = opt.querySelector('.avatar-selected');
                if (checkmark) checkmark.remove();
            });
            
            // Add selected class to clicked option
            this.classList.add('selected');
            selectedAvatar = this.getAttribute('data-avatar');
            
            // Add checkmark to selected option
            const checkmark = document.createElement('div');
            checkmark.className = 'avatar-selected';
            checkmark.innerHTML = '<i class="fas fa-check"></i>';
            this.appendChild(checkmark);
        });
    });
    
    // Save avatar changes
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            if (!selectedAvatar) return;
            
            // Show loading state
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';
            saveBtn.disabled = true;
            
            console.log('Saving avatar:', selectedAvatar);
            
            fetch('/dashboard/edit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ava: selectedAvatar })
            })
            .then(response => {
                console.log('Response status:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('Server response:', data);
                
                if (data.success) {
                    // Update avatar in the UI with a nice transition
                    const avatarImg = document.querySelector('.user-avatar-dashboard');
                    if (avatarImg) {
                        avatarImg.style.opacity = '0';
                        setTimeout(() => {
                            avatarImg.src = `/images/avatars/${selectedAvatar}.png`;
                            avatarImg.style.opacity = '1';
                        }, 300);
                    }
                    
                    // Close the modal
                    closeAvatarModal();
                    
                    // Show success message
                    showNotification('Avatar mis à jour avec succès!', 'success');
                    
                    // Reload the page after a short delay to ensure session data is refreshed
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    showNotification('Erreur lors de la modification de l\'avatar: ' + data.message, 'error');
                }
                
                // Reset button
                saveBtn.innerHTML = 'Enregistrer';
                saveBtn.disabled = false;
            })
            .catch(error => {
                console.error('Erreur lors de la modification de l\'avatar:', error);
                showNotification('Erreur lors de la modification de l\'avatar', 'error');
                
                // Reset button
                saveBtn.innerHTML = 'Enregistrer';
                saveBtn.disabled = false;
            });
        });
    }
    
    // Cancel avatar changes
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeAvatarModal);
    }
}

/**
 * Show a notification message
 */
function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        document.body.appendChild(notification);
        
        // Add CSS for notification
        const style = document.createElement('style');
        style.textContent = `
            #notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 10px;
                color: white;
                font-weight: 500;
                z-index: 1000;
                opacity: 0;
                transform: translateY(20px);
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                max-width: 300px;
            }
            #notification.info {
                background: linear-gradient(45deg, #4158D0, #53a9ff);
            }
            #notification.success {
                background: linear-gradient(45deg, #10b981, #059669);
            }
            #notification.error {
                background: linear-gradient(45deg, #ef4444, #dc2626);
            }
            #notification i {
                margin-right: 10px;
                font-size: 1.2rem;
            }
            #notification.show {
                opacity: 1;
                transform: translateY(0);
            }
        `;
        document.head.appendChild(style);
    }
    
    // Set icon based on type
    let icon = '';
    if (type === 'success') {
        icon = '<i class="fas fa-check-circle"></i>';
    } else if (type === 'error') {
        icon = '<i class="fas fa-exclamation-circle"></i>';
    } else {
        icon = '<i class="fas fa-info-circle"></i>';
    }
    
    // Set content and type
    notification.innerHTML = icon + message;
    notification.className = type;
    
    // Show and hide notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

