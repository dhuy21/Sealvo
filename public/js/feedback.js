document.addEventListener('DOMContentLoaded', function () {
  const formElements = document.querySelectorAll('.form-group, .feedback-actions');

  formElements.forEach((element, index) => {
    setTimeout(
      () => {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
      },
      (index + 1) * 150
    );
  });

  const feedbackForm = document.querySelector('.feedback-form');

  if (feedbackForm) {
    feedbackForm.addEventListener('submit', async function (e) {
      const submitButton = this.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.classList.add('pulse-animation');
      }

      e.preventDefault();

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
});

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
