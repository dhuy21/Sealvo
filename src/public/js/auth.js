// Authentication JavaScript

document.addEventListener('DOMContentLoaded', function () {
  initAuthentication();
});

function initAuthentication() {
  initPasswordToggle();
  initPasswordValidation();
  initFormAnimations();
  initAvatarSelection();
  initFormSubmission();
}

function initPasswordToggle() {
  const togglePassword = document.getElementById('togglePassword');
  const passwordField = document.getElementById('password');
  const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
  const confirmPasswordField = document.getElementById('password2');

  if (togglePassword && passwordField) {
    togglePassword.addEventListener('click', function () {
      const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordField.setAttribute('type', type);
      this.querySelector('i').classList.toggle('fa-eye');
      this.querySelector('i').classList.toggle('fa-eye-slash');
    });
  }

  if (toggleConfirmPassword && confirmPasswordField) {
    toggleConfirmPassword.addEventListener('click', function () {
      const type = confirmPasswordField.getAttribute('type') === 'password' ? 'text' : 'password';
      confirmPasswordField.setAttribute('type', type);
      this.querySelector('i').classList.toggle('fa-eye');
      this.querySelector('i').classList.toggle('fa-eye-slash');
    });
  }
}

function initPasswordValidation() {
  const passwordField = document.getElementById('password');
  const confirmPasswordField = document.getElementById('password2');

  if (passwordField && confirmPasswordField) {
    function validatePassword() {
      if (passwordField.value !== confirmPasswordField.value) {
        confirmPasswordField.setCustomValidity('Les mots de passe ne correspondent pas');
      } else {
        confirmPasswordField.setCustomValidity('');
      }
    }

    passwordField.addEventListener('change', validatePassword);
    confirmPasswordField.addEventListener('keyup', validatePassword);
  }
}

function initFormAnimations() {
  const animatedElements = document.querySelectorAll(
    '.form-group, .form-options, .btn-submit, .auth-separator, .social-login, .auth-footer'
  );

  animatedElements.forEach(function (element) {
    const delay = element.dataset.delay || 0;
    setTimeout(function () {
      element.classList.add('animate-in');
    }, delay);
  });
}

function initAvatarSelection() {
  const avatarOptions = document.querySelectorAll('.avatar-option input[type="radio"]');
  avatarOptions.forEach(function (option) {
    option.addEventListener('change', function () {
      document.querySelectorAll('.avatar-option').forEach(function (opt) {
        opt.classList.remove('selected');
      });
      this.closest('.avatar-option').classList.add('selected');
    });
  });
}

function validateForm(form) {
  const passwordField = form.querySelector('#password');
  const confirmPasswordField = form.querySelector('#password2');
  const requiredFields = form.querySelectorAll('input[required]');
  let isValid = true;

  requiredFields.forEach(function (field) {
    if (!field.value.trim()) {
      isValid = false;
      field.classList.add('error');
    } else {
      field.classList.remove('error');
    }
  });

  if (passwordField && confirmPasswordField && passwordField.value !== confirmPasswordField.value) {
    confirmPasswordField.classList.add('error');
    showMessage('Les mots de passe ne correspondent pas', 'error');
    return false;
  }

  return isValid;
}

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

function handleFormSubmit(form) {
  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!validateForm(this)) return;

    const submitButton = this.querySelector('.btn-submit');
    const formData = new FormData(this);
    const data = {};
    for (let [key, value] of formData.entries()) {
      data[key] = value;
    }

    if (submitButton) {
      submitButton.disabled = true;
      const originalContent = submitButton.innerHTML;
      submitButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;

      try {
        const response = await fetch(this.action, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (result.redirect) {
          window.location.href = result.redirect;
        } else {
          if (result.success) {
            showMessage(result.message, 'success');
          } else {
            showMessage(result.message, 'error');
          }
        }
      } catch (error) {
        console.error('Erreur:', error);
        showMessage('Une erreur est survenue. Veuillez réessayer plus tard.', 'error');
      }

      submitButton.disabled = false;
      submitButton.innerHTML = originalContent;
    }
  });
}

function showMessage(message, type) {
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
