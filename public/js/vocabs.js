  /* // Fonction pour supprimer un mot sans recharger la page
  function deleteWord(wordId, wordText, buttonElement) {
    
    
    // Trouver la ligne du tableau à supprimer
    const row = buttonElement.closest('tr');
    
    // Afficher un indicateur de chargement
    buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    buttonElement.disabled = true;
    
    // Envoyer la requête AJAX pour supprimer le mot
    fetch(`/monVocabs/delete/${wordId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      if (response.ok) {
        return response.json();
      }
      throw new Error('Erreur lors de la suppression');
    })
    .then(data => {
      // Créer une notification de succès
      showNotification('Mot supprimé avec succès', 'success');
      
      // Supprimer la ligne du tableau avec animation
      row.style.transition = 'all 0.5s ease';
      row.style.opacity = '0';
      row.style.height = '0';
      
      // Supprimer complètement après l'animation
      setTimeout(() => {
        row.remove();
        
        // Vérifier s'il reste des mots dans cette section
        const tbody = row.closest('tbody');
        if (tbody && tbody.children.length === 0) {
          // S'il n'y a plus de mots dans cette section, masquer la section
          const levelContainer = tbody.closest('.level-container');
          if (levelContainer) {
            levelContainer.style.display = 'none';
          }
        }
        
        // Vérifier s'il reste des mots au total
        const allLevelContainers = document.querySelectorAll('.level-container');
        let hasVisibleContainers = false;
        
        allLevelContainers.forEach(container => {
          if (container.style.display !== 'none') {
            hasVisibleContainers = true;
          }
        });
        
        if (!hasVisibleContainers) {
          // S'il n'y a plus de mots, afficher le message "aucun mot"
          const noWordsDiv = document.createElement('div');
          noWordsDiv.className = 'no-words';
          noWordsDiv.innerHTML = `
            <i class="fas fa-book"></i>
            <h3>Aucun mot dans votre vocabulaire</h3>
            <p>Commencez à ajouter des mots pour enrichir votre vocabulaire.</p>
            <a href="/monVocabs/add" class="btn">Ajouter votre premier mot</a>
          `;
          
          document.querySelector('.vocabulary-container').appendChild(noWordsDiv);
        }
      }, 500);
    })
    .catch(error => {
      console.error('Erreur:', error);
      showNotification('Erreur lors de la suppression', 'error');
      
      // Réactiver le bouton en cas d'erreur
      buttonElement.innerHTML = '<i class="fas fa-trash"></i>';
      buttonElement.disabled = false;
    });
  }
  
  // Afficher une notification
  function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.textContent = message;
    
    // Ajouter la notification au début du conteneur
    const container = document.querySelector('.vocabulary-container');
    container.insertBefore(notification, container.firstChild);
    
    // Faire disparaître après 3 secondes
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s ease';
      
      // Supprimer complètement après la transition
      setTimeout(() => {
        notification.remove();
      }, 500);
    }, 3000);
  }*/

// Fonction pour supprimer un mot sans recharger la page
    document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const wordId = this.getAttribute('data-id');
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                fetch(`/monVocabs/delete/${wordId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Supprimer la ligne du tableau
                        const row = this.closest('tr');
                        
                        if (row) {
                            row.remove();
                        }
    
                        // Afficher un message de succès en haut de la page
                        const vocabContainer = document.querySelector('.vocabulary-container');
                        if (vocabContainer) {
                            const successMessage = document.createElement('div');
                            successMessage.className = 'alert alert-success';
                            successMessage.textContent = data.message;
                            
                            // Insérer après le titre (H1)
                            const h1 = vocabContainer.querySelector('h1');
                            if (h1) {
                                vocabContainer.insertBefore(successMessage, h1.nextSibling);
                            } else {
                                vocabContainer.insertBefore(successMessage, vocabContainer.firstChild);
                            }
                            
                            // Supprimer après 3 secondes
                            setTimeout(() => {
                                successMessage.remove();
                            }, 3000);
                        }
                    } else {
                        alert(data.message || 'Erreur lors de la suppression du mot');
                    }
                })
                .catch(error => {
                    console.log('Error:', error);
                    alert('Une erreur est survenue lors de la suppression du mot');
                });
            });
        });
    });

// Fonction pour modifier un mot sans recharger la page
    document.addEventListener('DOMContentLoaded', function() {
      document.querySelectorAll('.edit-btn').forEach(button => {
          button.addEventListener('click', function(e) {
              e.preventDefault();
              const wordId = this.getAttribute('data-id');
              const row = this.closest('tr');
              if (!row.dataset.editing) {
                for (let i = 0; i < 7; i++) {
                  const text = row.cells[i].textContent;
                  row.cells[i].innerHTML = `<input value="${text}" />`; 
                }
                row.cells[4].innerHTML = `
                  <i class="fas fa-times"></i>
                  <i class="fas fa-check"></i>
                `;

                row.dataset.editing = "true";
              }
              fetch(`/monVocabs/edit/${wordId}`, {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json'
                  }
              })
              .then(response => response.json())
              .then(data => {
                  if (data.success) {
                      // Supprimer la ligne du tableau
                      
  
                      // Afficher un message de succès en haut de la page
                      const vocabContainer = document.querySelector('.vocabulary-container');
                      if (vocabContainer) {
                          const successMessage = document.createElement('div');
                          successMessage.className = 'alert alert-success';
                          successMessage.textContent = data.message;
                          
                          // Insérer après le titre (H1)
                          const h1 = vocabContainer.querySelector('h1');
                          if (h1) {
                              vocabContainer.insertBefore(successMessage, h1.nextSibling);
                          } else {
                              vocabContainer.insertBefore(successMessage, vocabContainer.firstChild);
                          }
                          
                          // Supprimer après 3 secondes
                          setTimeout(() => {
                              successMessage.remove();
                          }, 3000);
                      }
                  } else {
                      alert(data.message || 'Erreur lors de la suppression du mot');
                  }
              })
              .catch(error => {
                  console.log('Error:', error);
                  alert('Une erreur est survenue lors de la suppression du mot');
              });
          });
      });
  });
