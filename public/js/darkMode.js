/**
 * Dark Mode Toggle Functionality
 */
document.addEventListener('DOMContentLoaded', function() {
  const darkModeToggle = document.getElementById('darkModeToggle');
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  
  // Function to set theme based on user preference or system preference
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    
    // Log to confirm theme change (for debugging)
    console.log('Theme set to:', theme);
  }
  
  // Function to toggle theme
  function toggleTheme() {
    const currentTheme = localStorage.getItem('theme') || 
      (prefersDarkScheme.matches ? 'dark' : 'light');
    
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    // Log the toggle action
    console.log('Theme toggled from', currentTheme, 'to', newTheme);
  }
  
  // Check if user has previously selected a theme
  const savedTheme = localStorage.getItem('theme');
  
  if (savedTheme) {
    // If user has previously selected a theme, use it
    setTheme(savedTheme);
  } else if (prefersDarkScheme.matches) {
    // If user hasn't selected a theme but prefers dark mode
    setTheme('dark');
  } else {
    // Default to light mode
    setTheme('light');
  }
  
  // Add click event listener to the dark mode toggle button
  if (darkModeToggle) {
    darkModeToggle.addEventListener('click', function(e) {
      e.preventDefault();
      toggleTheme();
    });
    console.log('Dark mode toggle button initialized');
  } else {
    console.error('Dark mode toggle button not found in the DOM');
  }
  
  // Listen for changes in system color scheme preference
  prefersDarkScheme.addEventListener('change', function(e) {
    // Only update if user hasn't manually set a preference
    if (!localStorage.getItem('theme')) {
      setTheme(e.matches ? 'dark' : 'light');
    }
  });
}); 