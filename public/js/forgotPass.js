// Authentication JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initAuthentication();
});

/**
 * Initialize all authentication functionality
 */
function initAuthentication() {
    initFormAnimations();
    initFormSubmission();
}


/**
 * Initialize form element animations
 */
function initFormAnimations() {
    const animatedElements = document.querySelectorAll('.form-group, .form-options, .btn-submit, .auth-separator, .social-login, .auth-footer');
    
    animatedElements.forEach(function(element) {
        const delay = element.dataset.delay || 0;
        setTimeout(function() {
            element.classList.add('animate-in');
        }, delay);
    });
}


/**
 * Validate form fields
 */
function validateForm(form) {
    const passwordField = form.querySelector('#password');
    const confirmPasswordField = form.querySelector('#password2');
    const requiredFields = form.querySelectorAll('input[required]');
    let isValid = true;

    // Basic required fields validation
    requiredFields.forEach(function(field) {
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('error');
        } else {
            field.classList.remove('error');
        }
    });

    // Password confirmation check for registration
    if (passwordField && confirmPasswordField && passwordField.value !== confirmPasswordField.value) {
        isValid = false;
        confirmPasswordField.classList.add('error');
        showMessage('Les mots de passe ne correspondent pas', 'error');
        return false;
    }

    return isValid;
}

/**
 * Initialize form submission handling
 */
function initFormSubmission() {
    const forgotPasswordForm = document.querySelector('form[action="/login/forgotPassword"]');
    const resetPasswordForm = document.querySelector('form[action="/login/resetPassword"]');
    
    if (forgotPasswordForm) {
        handleFormSubmit(forgotPasswordForm);
    }
    
    if (resetPasswordForm) {
        handleFormSubmit(resetPasswordForm);
    }
}

/**
 * Handle form submission with loading state
 */
function handleFormSubmit(form) {
    form.addEventListener('submit', async function(e) {
        e.preventDefault(); // Prevent normal form submission
        
        // Validate form first
        if (!validateForm(this)) {
            return; // Stop if validation fails
        }
        
        const submitButton = this.querySelector('.btn-submit');
        
        // Convert form data to JSON
        const formData = new FormData(this);
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        if (submitButton) {
            // Show loading state
            submitButton.disabled = true;
            const originalContent = submitButton.innerHTML;
            submitButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
            
            try {
                const response = await fetch(this.action, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                // Redirect if specified in response
                if (result.redirect) {

                    window.location.href = result.redirect;

                } else {

                    if (result.success) {
                        // Handle success
                        showMessage(result.message, 'success');
                        
                    } else {
                        // Handle error
                        showMessage(result.message, 'error');
                    }
                }
                
            } catch (error) {
                console.error('Erreur:', error);
                showMessage('Une erreur est survenue. Veuillez réessayer plus tard.', 'error');
            }
            
            // Reset button
            submitButton.disabled = false;
            submitButton.innerHTML = originalContent;
        }
    });
}

/**
 * Show message to user
 */
function showMessage(message, type) {
    // Remove existing messages
    const alert = document.getElementById('alert');
    alert.classList.remove('alert-success');
    alert.classList.remove('alert-error');
    alert.innerHTML = '';
    

    alert.classList.add(`alert-${type}`);
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        ${message}
    `;
}