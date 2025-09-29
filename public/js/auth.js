// Authentication JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initAuthentication();
});

/**
 * Initialize all authentication functionality
 */
function initAuthentication() {
    initPasswordToggle();
    initPasswordValidation();
    initFormAnimations();
    initAvatarSelection();
    initFormSubmission();
}

/**
 * Initialize password visibility toggle functionality
 */
function initPasswordToggle() {
    const togglePassword = document.getElementById('togglePassword');
    const passwordField = document.getElementById('password');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    const confirmPasswordField = document.getElementById('password2');

    // Password visibility toggle
    if (togglePassword && passwordField) {
        togglePassword.addEventListener('click', function() {
            const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordField.setAttribute('type', type);
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }

    if (toggleConfirmPassword && confirmPasswordField) {
        toggleConfirmPassword.addEventListener('click', function() {
            const type = confirmPasswordField.getAttribute('type') === 'password' ? 'text' : 'password';
            confirmPasswordField.setAttribute('type', type);
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }
}

/**
 * Initialize password match validation for registration
 */
function initPasswordValidation() {
    const passwordField = document.getElementById('password');
    const confirmPasswordField = document.getElementById('password2');

    if (passwordField && confirmPasswordField) {
        function validatePassword() {
            if (passwordField.value !== confirmPasswordField.value) {
                confirmPasswordField.setCustomValidity("Les mots de passe ne correspondent pas");
            } else {
                confirmPasswordField.setCustomValidity('');
            }
        }
        
        passwordField.addEventListener('change', validatePassword);
        confirmPasswordField.addEventListener('keyup', validatePassword);
    }
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
 * Initialize avatar selection functionality
 */
function initAvatarSelection() {
    const avatarOptions = document.querySelectorAll('.avatar-option input[type="radio"]');
    avatarOptions.forEach(function(option) {
        option.addEventListener('change', function() {
            // Remove selected class from all options
            document.querySelectorAll('.avatar-option').forEach(function(opt) {
                opt.classList.remove('selected');
            });
            // Add selected class to current option
            this.closest('.avatar-option').classList.add('selected');
        });
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
    const loginForm = document.querySelector('form[action="/login"]');
    const registerForm = document.querySelector('form[action="/registre"]');
    
    if (loginForm) {
        handleFormSubmit(loginForm);
    }
    
    if (registerForm) {
        handleFormSubmit(registerForm);
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