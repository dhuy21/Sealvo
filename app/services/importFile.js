const wordModel = require('../models/words');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');

// Configurer le stockage des fichiers uploadés
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        // Créer le dossier s'il n'existe pas
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        const validFileTypes = ['.xlsx', '.xls', '.csv', '.pdf'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (validFileTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Type de fichier non supporté. Utilisez des fichiers Excel (xlsx, xls, csv) ou PDF.'));
        }
    }
}).single('file');

// Fonction pour traiter les fichiers Excel/CSV
const processExcelFile = async (filePath) => {
    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Ignorer l'en-tête si présent
        const startRow = data[0][0] === 'Mot' || data[0][0] === 'Word' ? 1 : 0;
        
        // Convertir les données en objets de mots
        const words = [];
        for (let i = startRow; i < data.length; i++) {
            const row = data[i];
            if (row.length >= 6) { // Au moins les champs obligatoires
                words.push({
                    word: row[0] || '',
                    subject: row[1] || '',
                    type: row[2] || '',
                    pronunciation: row[3] || '',
                    meaning: row[4] || '',
                    example: row[5] || '',
                    synonyms: row[6] || '',
                    antonyms: row[7] || '',
                    grammar: row[8] || '',
                    level: row[9] || 'x' // Niveau par défaut
                });
            }
        }
        
        return words;
    } catch (error) {
        console.error('Erreur lors du traitement du fichier Excel:', error);
        throw new Error('Impossible de traiter le fichier Excel');
    }
};

// Fonction pour traiter les fichiers PDF
const processPdfFile = async (filePath) => {
    try {
        // Lire le fichier PDF
        const data = await fs.promises.readFile(filePath);
        const pdfDoc = await PDFDocument.load(data);
        
        // Extraction de texte basique - cette partie peut nécessiter un module plus avancé
        // comme pdf.js ou pdfjs-extract pour une extraction complète du texte
        const words = [];
        
        // Note: Ce code est un placeholder. L'extraction réelle du texte PDF
        // nécessitera une bibliothèque plus spécialisée
        console.log('Traitement de PDF non implémenté de manière complète');
        
        return words;
    } catch (error) {
        console.error('Erreur lors du traitement du fichier PDF:', error);
        throw new Error('Impossible de traiter le fichier PDF');
    }
};


class ImportFile {
    async importWords(req, res) {
        try {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.redirect('/login?error=Vous devez être connecté pour importer des mots');
            }
            
            upload(req, res, async (err) => {
                if (err) {
                    return res.render('addWord', {
                        title: 'Ajouter un mot',
                        user: req.session.user,
                        error: err.message
                    });
                }
                
                if (!req.file) {
                    return res.render('addWord', {
                        title: 'Ajouter un mot',
                        user: req.session.user,
                        error: 'Aucun fichier n\'a été téléchargé'
                    });
                }
                
                const filePath = req.file.path;
                const fileExt = path.extname(req.file.originalname).toLowerCase();
                
                let words = [];
                
                // Traiter le fichier selon son type
                if (['.xlsx', '.xls', '.csv'].includes(fileExt)) {
                    // Traiter les fichiers Excel
                    words = await processExcelFile(filePath);
                } else if (fileExt === '.pdf') {
                    // Traiter les fichiers PDF
                    words = await processPdfFile(filePath);
                }
                
                if (words.length === 0) {
                    return res.render('addWord', {
                        title: 'Ajouter un mot',
                        user: req.session.user,
                        error: 'Aucun mot n\'a été trouvé dans le fichier importé'
                    });
                }
                
                // Ajouter chaque mot à la base de données
                let successCount = 0;
                let errorCount = 0;
                
                console.log(`Traitement de ${words.length} mots à importer`);
                
                for (const wordData of words) {
                    try {
                        // Vérifier que les champs obligatoires sont présents
                        if (!wordData.word || !wordData.subject || !wordData.type || 
                            !wordData.meaning || !wordData.example) {
                            console.log(`Mot ignoré (champs manquants): ${JSON.stringify(wordData)}`);
                            errorCount++;
                            continue;
                        }
                        
                        // Assurer que level est défini
                        if (wordData.level === undefined || wordData.level === null) {
                            console.log(`Niveau non défini pour le mot: ${wordData.word}, utilisation du niveau par défaut`);
                            wordData.level = 'x'; // Niveau par défaut
                        }
                        
                        console.log(`Tentative d'ajout du mot: ${wordData.word}, niveau: ${wordData.level}`);
                        const wordId = await wordModel.create(wordData, req.session.user.id);
                        console.log(`Mot ajouté avec succès, ID: ${wordId}`);

                        
                        successCount++;
                    } catch (error) {
                        console.error(`Erreur lors de l'ajout du mot ${wordData.word}:`, error);
                        errorCount++;
                    }
                }
                
                // Supprimer le fichier temporaire
                fs.unlinkSync(filePath);
                
                console.log(`Importation terminée: ${successCount} succès, ${errorCount} erreurs`);
                
                // Rediriger avec un message de succès
                res.redirect(`/monVocabs?success=${successCount} mot(s) importé(s) avec succès. ${errorCount} erreur(s)`);
            });
        } catch (error) {
            console.error('Erreur lors de l\'importation des mots:', error);
            res.render('addWord', {
                title: 'Ajouter un mot',
                user: req.session.user,
                error: 'Une erreur est survenue lors de l\'importation des mots'
            });
        }
    }
}

module.exports = new ImportFile();