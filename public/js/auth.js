// Authentication JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Get form elements
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

    // Password match validation for registration
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

    // Animate form elements sequentially for login page
    const animatedElements = document.querySelectorAll('.form-group, .form-options, .btn-submit, .auth-separator, .social-login, .auth-footer');
    
    animatedElements.forEach(function(element) {
        const delay = element.dataset.delay || 0;
        setTimeout(function() {
            element.classList.add('animate-in');
        }, delay);
    });

    // Avatar selection for registration page
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

    // Form validation
    const authForm = document.getElementById('authForm') || document.getElementById('loginForm') || document.getElementById('registerForm');
    if (authForm) {
        authForm.addEventListener('submit', function(e) {
            // Basic form validation
            const requiredFields = this.querySelectorAll('input[required]');
            let isValid = true;

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
                alert('Les mots de passe ne correspondent pas');
            }

            if (!isValid) {
                e.preventDefault();
            }
        });
    }
}); 