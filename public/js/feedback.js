document.addEventListener('DOMContentLoaded', function() {
    // Animate form elements appearing sequentially
    const formElements = document.querySelectorAll('.form-group, .feedback-actions');
    
    formElements.forEach((element, index) => {
      setTimeout(() => {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
      }, (index + 1) * 150);
    });
    
    // Form validation
    const feedbackForm = document.querySelector('.feedback-form');
    
    if (feedbackForm) {
      feedbackForm.addEventListener('submit', async function(e) {
        // Add pulse effect to submit button
        const submitButton = this.querySelector('button[type="submit"]');
        if (submitButton) {
          submitButton.classList.add('pulse-animation');
          
        }

        e.preventDefault(); // Prevent normal form submission
        
    
        
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
  });

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