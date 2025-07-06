/**
 * My Packages - JavaScript Interactions
 * Gestion des packages de vocabulaire
 */

document.addEventListener('DOMContentLoaded', function() {
    // Vérifier si nous sommes sur la page My Packages
    if (!document.querySelector('.packages-container')) {
        return;
    }

    // Variables globales
    let allPackages = [];
    let currentFilter = 'all';
    let currentEditId = null;

    // Éléments DOM
    const packagesGrid = document.getElementById('packagesGrid');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const filterTabs = document.querySelectorAll('.filter-tab');
    const noResults = document.getElementById('noResults');
    
    // Modal elements
    const packageModal = document.getElementById('packageModal');
    const deleteModal = document.getElementById('deleteModal');
    const packageForm = document.getElementById('packageForm');
    const modalTitle = document.getElementById('modalTitle');
    const submitBtn = document.getElementById('submitBtn');
    
    // Boutons
    const createPackageBtn = document.getElementById('createPackageBtn');
    const createFirstPackageBtn = document.querySelector('.create-first-package-btn');
    const closeModal = document.getElementById('closeModal');
    const closeDeleteModal = document.getElementById('closeDeleteModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    // Initialisation
    init();

    function init() {
        loadPackagesData();
        setupEventListeners();
        updateStats();
        addAnimations();
        console.log('✅ My Packages initialized successfully');
    }

    // Charger les données des packages depuis le DOM
    function loadPackagesData() {
        const packageCards = document.querySelectorAll('.package-card');
        allPackages = [];

        packageCards.forEach(card => {
            const packageData = {
                id: card.dataset.packageId,
                mode: card.dataset.mode,
                name: card.querySelector('.package-name')?.textContent || '',
                description: card.querySelector('.package-description')?.textContent || '',
                element: card
            };
            allPackages.push(packageData);
        });

        console.log(`Loaded ${allPackages.length} packages`);
    }

    // Configuration des event listeners
    function setupEventListeners() {
        // Recherche
        if (searchInput && searchBtn) {
            searchInput.addEventListener('input', handleSearch);
            searchBtn.addEventListener('click', handleSearch);
            clearSearchBtn?.addEventListener('click', clearSearch);
        }

        // Filtres
        filterTabs.forEach(tab => {
            tab.addEventListener('click', handleFilterChange);
        });

        // Boutons de création
        createPackageBtn?.addEventListener('click', openCreateModal);
        createFirstPackageBtn?.addEventListener('click', openCreateModal);

        // Modal controls
        closeModal?.addEventListener('click', closePackageModal);
        closeDeleteModal?.addEventListener('click', closeDeleteConfirmModal);
        cancelBtn?.addEventListener('click', closePackageModal);
        cancelDeleteBtn?.addEventListener('click', closeDeleteConfirmModal);
        confirmDeleteBtn?.addEventListener('click', confirmDelete);

        // Form submission
        packageForm?.addEventListener('submit', handleFormSubmit);

        // Fermeture modal en cliquant à l'extérieur
        packageModal?.addEventListener('click', (e) => {
            if (e.target === packageModal) closePackageModal();
        });
        deleteModal?.addEventListener('click', (e) => {
            if (e.target === deleteModal) closeDeleteConfirmModal();
        });

        // Boutons d'action des packages
        setupPackageActionListeners();

        // Raccourcis clavier
        document.addEventListener('keydown', handleKeyboardShortcuts);
    }

    // Configuration des listeners pour les actions des packages
    function setupPackageActionListeners() {
        // Edit buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', handleEditPackage);
        });

        // Delete buttons  
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', handleDeletePackage);
        });

        // View package buttons
        document.querySelectorAll('.view-package-btn').forEach(btn => {
            btn.addEventListener('click', handleViewPackage);
        });

        // Learn package buttons
        document.querySelectorAll('.learn-package-btn').forEach(btn => {
            btn.addEventListener('click', handleLearnPackage);
        });
    }

    // Gestion de la recherche
    function handleSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            clearSearch();
            return;
        }

        // Animation de recherche
        searchInput.parentElement.classList.add('searching');
        setTimeout(() => {
            searchInput.parentElement.classList.remove('searching');
        }, 600);

        // Afficher le bouton clear
        showClearButton();

        // Filtrer les packages
        filterPackages(searchTerm, currentFilter);
    }

    // Effacer la recherche
    function clearSearch() {
        searchInput.value = '';
        hideClearButton();
        filterPackages('', currentFilter);
    }

    // Afficher/masquer le bouton clear
    function showClearButton() {
        if (clearSearchBtn) {
            clearSearchBtn.style.display = 'flex';
            setTimeout(() => {
                clearSearchBtn.style.opacity = '1';
                clearSearchBtn.style.transform = 'translateY(-50%) scale(1)';
            }, 10);
        }
    }

    function hideClearButton() {
        if (clearSearchBtn) {
            clearSearchBtn.style.opacity = '0';
            clearSearchBtn.style.transform = 'translateY(-50%) scale(0.8)';
            setTimeout(() => {
                clearSearchBtn.style.display = 'none';
            }, 300);
        }
    }

    // Gestion du changement de filtre
    function handleFilterChange(e) {
        // Retirer la classe active des autres onglets
        filterTabs.forEach(tab => tab.classList.remove('active'));
        
        // Ajouter la classe active à l'onglet cliqué
        e.target.classList.add('active');
        
        // Mettre à jour le filtre actuel
        currentFilter = e.target.dataset.filter;
        
        // Appliquer le filtre
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
        filterPackages(searchTerm, currentFilter);

        // Animation de l'onglet
        e.target.style.transform = 'scale(0.95)';
        setTimeout(() => {
            e.target.style.transform = 'scale(1)';
        }, 150);
    }

    // Filtrer les packages
    function filterPackages(searchTerm = '', filter = 'all') {
        let visibleCount = 0;
        let hasResults = false;

        allPackages.forEach(package => {
            const matchesSearch = searchTerm === '' || 
                package.name.toLowerCase().includes(searchTerm) ||
                package.description.toLowerCase().includes(searchTerm);
            
            const matchesFilter = filter === 'all' || package.mode === filter;
            
            const shouldShow = matchesSearch && matchesFilter;
            
            if (package.element) {
                if (shouldShow) {
                    showPackageCard(package.element, visibleCount);
                    visibleCount++;
                    hasResults = true;
                } else {
                    hidePackageCard(package.element);
                }
            }
        });

        // Afficher/masquer le message "aucun résultat"
        toggleNoResults(!hasResults && (searchTerm !== '' || filter !== 'all'));
        
        console.log(`Filtered packages: ${visibleCount} visible`);
    }

    // Afficher une carte de package avec animation
    function showPackageCard(element, index) {
        element.style.display = 'block';
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px) scale(0.95)';
        
        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0) scale(1)';
            element.style.transition = 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
        }, index * 50); // Animation décalée
    }

    // Masquer une carte de package avec animation
    function hidePackageCard(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(-20px) scale(0.95)';
        element.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
            element.style.display = 'none';
        }, 300);
    }

    // Afficher/masquer le message "aucun résultat"
    function toggleNoResults(show) {
        if (noResults) {
            if (show) {
                noResults.style.display = 'block';
                setTimeout(() => {
                    noResults.style.opacity = '1';
                    noResults.style.transform = 'translateY(0)';
                }, 10);
            } else {
                noResults.style.opacity = '0';
                noResults.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    noResults.style.display = 'none';
                }, 300);
            }
        }
    }

    // Mettre à jour les statistiques
    function updateStats() {
        const publicCount = allPackages.filter(p => p.mode === 'public').length;
        const privateCount = allPackages.filter(p => p.mode === 'private').length;
        
        const publicElement = document.getElementById('public-count');
        const privateElement = document.getElementById('private-count');
        
        if (publicElement) animateCounter(publicElement, publicCount);
        if (privateElement) animateCounter(privateElement, privateCount);
    }

    // Animation du compteur
    function animateCounter(element, targetValue) {
        const startValue = parseInt(element.textContent) || 0;
        const duration = 1000;
        const startTime = performance.now();
        
        function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentValue = Math.round(startValue + (targetValue - startValue) * progress);
            element.textContent = currentValue;
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        }
        
        requestAnimationFrame(updateCounter);
    }

    // Ouvrir le modal de création
    function openCreateModal() {
        currentEditId = null;
        modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Créer un package';
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Créer';
        
        // Réinitialiser le formulaire
        packageForm.reset();
        
        // Afficher le modal
        showModal(packageModal);
        
        // Focus sur le premier champ
        document.getElementById('packageName')?.focus();
    }

    // Ouvrir le modal d'édition
    function openEditModal(packageId) {
        currentEditId = packageId;
        modalTitle.innerHTML = '<i class="fas fa-edit"></i> Modifier le package';
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Modifier';
        
        // Récupérer les données du package
        const packageCard = document.querySelector(`[data-package-id="${packageId}"]`);
        if (packageCard) {
            const name = packageCard.querySelector('.package-name')?.textContent || '';
            const description = packageCard.querySelector('.package-description')?.textContent || '';
            const mode = packageCard.dataset.mode || 'private';
            
            // Remplir le formulaire
            document.getElementById('packageName').value = name;
            document.getElementById('packageDescription').value = description;
            document.getElementById('packageMode').value = mode;
        }
        
        // Afficher le modal
        showModal(packageModal);
        
        // Focus sur le premier champ
        document.getElementById('packageName')?.focus();
    }

    // Afficher un modal avec animation
    function showModal(modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Bloquer le scroll en arrière-plan
        modal.style.paddingRight = getScrollbarWidth() + 'px';
    }

    // Fermer le modal de package
    function closePackageModal() {
        packageModal.classList.remove('active');
        document.body.style.overflow = '';
        packageModal.style.paddingRight = '';
        
        // Réinitialiser le formulaire après la fermeture
        setTimeout(() => {
            packageForm.reset();
            currentEditId = null;
        }, 300);
    }

    // Fermer le modal de confirmation de suppression
    function closeDeleteConfirmModal() {
        deleteModal.classList.remove('active');
        document.body.style.overflow = '';
        deleteModal.style.paddingRight = '';
    }

    // Obtenir la largeur de la scrollbar
    function getScrollbarWidth() {
        const outer = document.createElement('div');
        outer.style.visibility = 'hidden';
        outer.style.overflow = 'scroll';
        outer.style.msOverflowStyle = 'scrollbar';
        document.body.appendChild(outer);
        
        const inner = document.createElement('div');
        outer.appendChild(inner);
        
        const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
        document.body.removeChild(outer);
        
        return scrollbarWidth;
    }

    // Gestion de la soumission du formulaire
    async function handleFormSubmit(e) {
        e.preventDefault();
        
        // Désactiver le bouton de soumission
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        
        const formData = new FormData(packageForm);
        const packageData = {
            package_name: formData.get('package_name'),
            package_description: formData.get('package_description'),
            mode: formData.get('mode')
        };
        
        try {
            let response;
            if (currentEditId) {
                // Mise à jour
                response = await fetch(`/myPackages/edit/${currentEditId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(packageData)
                });
            } else {
                // Création
                response = await fetch('/myPackages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(packageData)
                });
            }
            
            if (response.ok) {
                showNotification(
                    currentEditId ? 'Package modifié avec succès!' : 'Package créé avec succès!',
                    'success'
                );
                
                // Recharger la page après un délai
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                const errorData = await response.json();
                showNotification(errorData.message || 'Une erreur est survenue', 'error');
            }
        } catch (error) {
            console.error('Erreur lors de la soumission:', error);
            showNotification('Erreur de connexion', 'error');
        } finally {
            // Réactiver le bouton
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }
    }

    // Gestion de l'édition d'un package
    function handleEditPackage(e) {
        const packageId = e.target.closest('.edit-btn').dataset.packageId;
        openEditModal(packageId);
        
        // Animation du bouton
        animateButton(e.target.closest('.edit-btn'));
    }

    // Gestion de la suppression d'un package
    function handleDeletePackage(e) {
        const packageId = e.target.closest('.delete-btn').dataset.packageId;
        currentEditId = packageId;
        
        // Afficher le modal de confirmation
        showModal(deleteModal);
        
        // Animation du bouton
        animateButton(e.target.closest('.delete-btn'));
    }

    // Confirmer la suppression
    async function confirmDelete() {
        if (!currentEditId) return;
        
        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.classList.add('loading');
        
        try {
            const response = await fetch(`/myPackages/delete/${currentEditId}`, {
                method: 'POST'
            });
            
            if (response.ok) {
                showNotification('Package supprimé avec succès!', 'success');
                
                // Retirer la carte avec animation
                const packageCard = document.querySelector(`[data-package-id="${currentEditId}"]`);
                if (packageCard) {
                    packageCard.style.transform = 'scale(0.8)';
                    packageCard.style.opacity = '0';
                    setTimeout(() => {
                        packageCard.remove();
                        updateStats();
                        loadPackagesData();
                    }, 300);
                }
                
                closeDeleteConfirmModal();
            } else {
                const errorData = await response.json();
                showNotification(errorData.message || 'Erreur lors de la suppression', 'error');
            }
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            showNotification('Erreur de connexion', 'error');
        } finally {
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.classList.remove('loading');
        }
    }

    // Voir un package
    function handleViewPackage(e) {
        const packageId = e.target.closest('.view-package-btn').dataset.packageId;
        window.location.href = `/monVocabs?package=${packageId}`;
        
        animateButton(e.target.closest('.view-package-btn'));
    }

    // Apprendre un package
    function handleLearnPackage(e) {
        const packageId = e.target.closest('.learn-package-btn').dataset.packageId;
        window.location.href = `/monVocabs/learn?package=${packageId}`;
        
        animateButton(e.target.closest('.learn-package-btn'));
    }

    // Animation des boutons
    function animateButton(button) {
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 150);
    }

    // Afficher une notification
    function showNotification(message, type = 'info') {
        // Supprimer les notifications existantes
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notif => notif.remove());
        
        // Créer la nouvelle notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Ajouter les styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10B981' : '#EF4444'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Animation d'entrée
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Animation de sortie
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // Ajouter des animations d'entrée
    function addAnimations() {
        const elements = document.querySelectorAll('.fade-in');
        elements.forEach((element, index) => {
            element.style.animationDelay = `${index * 0.1}s`;
        });
    }

    // Raccourcis clavier
    function handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + K pour ouvrir la recherche
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput?.focus();
        }
        
        // Echap pour fermer les modals
        if (e.key === 'Escape') {
            if (packageModal.classList.contains('active')) {
                closePackageModal();
            }
            if (deleteModal.classList.contains('active')) {
                closeDeleteConfirmModal();
            }
        }
        
        // Ctrl/Cmd + Enter pour soumettre le formulaire
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            if (packageModal.classList.contains('active')) {
                packageForm.dispatchEvent(new Event('submit'));
            }
        }
    }

    // Fonction utilitaire pour déboguer
    window.myPackagesDebug = {
        allPackages,
        currentFilter,
        reloadData: loadPackagesData,
        updateStats
    };

    console.log('🎉 My Packages JavaScript loaded successfully!');
});
