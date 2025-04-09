// Effet hover sur les liens de contact
document.querySelectorAll('a[style*="background: rgba(255, 255, 255, 0.5)"]').forEach(link => {
    link.addEventListener('mouseover', () => {
    link.style.background = 'hsla(359, 97.30%, 56.70%, 0.88)';
    link.style.transform = 'translateY(-3px)';
    link.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.1)';
    });
      
    link.addEventListener('mouseout', () => {
    link.style.background = 'rgba(255, 255, 255, 0.74)';
    link.style.transform = 'translateY(0)';
    link.style.boxShadow = 'none';
    });
});
   