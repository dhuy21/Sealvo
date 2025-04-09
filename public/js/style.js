document.addEventListener('DOMContentLoaded', function() {
    const footer = document.getElementById('site-footer');
    let lastScrollPosition = 0;
    let isFooterVisible = false;
    
    // Update copyright year
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // Show footer only when scrolling to bottom of page
    window.addEventListener('scroll', function() {
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.body.offsetHeight;
      const scrollThreshold = 100; // pixels from bottom
      
      // Déterminer si nous sommes près du bas
      const isNearBottom = (windowHeight + scrollPosition) >= (documentHeight - scrollThreshold);
      
      // Déterminer la direction du défilement (vers le haut ou vers le bas)
      const isScrollingDown = scrollPosition > lastScrollPosition;
      
      // Mettre à jour la dernière position de défilement
      lastScrollPosition = scrollPosition;
      
      // Ne pas afficher le footer si on est tout en haut de la page
      if (scrollPosition < 10) {
        footer.classList.remove('visible');
        isFooterVisible = false;
        return;
      }
      
      // Afficher le footer uniquement si on est près du bas et qu'on défile vers le bas
      if (isNearBottom && isScrollingDown) {
        footer.classList.add('visible');
        isFooterVisible = true;
      } 
      // Masquer le footer si on n'est pas près du bas ou si on défile vers le haut
      else if (!isNearBottom || (scrollPosition < 100)) {
        footer.classList.remove('visible');
        isFooterVisible = false;
      }
    });
    
    // Hide footer when clicked
    footer.addEventListener('click', function() {
      footer.classList.remove('visible');
      isFooterVisible = false;
    });
  });
