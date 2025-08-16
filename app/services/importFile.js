const wordModel = require('../models/words');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const geminiService = require('./gemini');

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
        const validFileTypes = ['.xlsx', '.xls'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (validFileTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Type de fichier non supporté. Utilisez des fichiers Excel (xlsx, xls)'));
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

        //On juste prendre les rows qui ont un mot
        const rowsWithWord = data.filter(row => row[0] !== undefined && row[1] !== undefined &&  row[3] !== undefined  && row[5] !== undefined && row[10] !== undefined);
        
        // Ignorer l'en-tête si présent
        const startRow = data[0][0] === 'Mot' || data[0][0] === 'Word' ? 1 : 0;
        
        // Convertir les données en objets de mots
        const words = [];
        for (let i = startRow; i < rowsWithWord.length; i++) {
            const row = rowsWithWord[i];
            if (row[0] !== '' && row[1] !== '' &&  row[3] !== ''  && row[5] !== '' && row[10] !== '') { // Au moins les champs obligatoires
                words.push({
                    id: i,
                    word: row[0],
                    language_code: row[1].replace(/\([^)]*\)/g, '').trim(),
                    subject: row[2] || '',
                    type: row[3],
                    pronunciation: row[4] || '',
                    meaning: row[5],
                    example: row[6] || '',
                    synonyms: row[7] || '',
                    antonyms: row[8] || '',
                    grammar: row[9] || '',
                    level: row[10] 
                });
            } else {
                throw new Error('Les champs obligatoires sont manquants');
            }
        }
        
        return words;
    } catch (error) {
        throw error;
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
        
        return words;
    } catch (error) {
        console.error( error);
        throw new Error('Impossible de traiter le fichier PDF');
    }
};

class ImportFile {
    async importWords(req, res) {
            // Vérifier si l'utilisateur est connecté
            if (!req.session.user) {
                return res.redirect('/login?error=Vous devez être connecté pour importer des mots');
            }
            
            upload(req, res, async (err) => {
                try {
                    if (err) {
                        throw err;
                    }
                    
                    if (!req.file) {
                        throw new Error('Aucun fichier n\'a été téléchargé');
                    }
                
                    const filePath = req.file.path;
                    const fileExt = path.extname(req.file.originalname).toLowerCase();
                    
                    let words = [];
                    let words_no_example = [];
                    let words_with_error_example = [];
                    const package_id = req.query.package;
                    
                    let errExample = 0;
                    // Traiter le fichier selon son type
                    if (['.xlsx', '.xls'].includes(fileExt)) {
                        // Traiter les fichiers Excel
                        words = await processExcelFile(filePath);
                    } 
                    

                    for (const word of words) {
                        try {
                            console.log(word.language_code);
                            if (!word.meaning || !word.type || !word.word) {
                                errExample ++ ;
                                continue;
                            } else if (word.example === '') {
                                words_no_example.push({
                                    id: word.id,
                                    word: word.word,
                                    language_code: word.language_code,
                                    meaning: word.meaning,
                                    type: word.type
                                });
                            } else if (word.example !== '') {
                                words_with_error_example.push({
                                    id: word.id,
                                    word: word.word,
                                    language_code: word.language_code,
                                    meaning: word.meaning,
                                    type: word.type,
                                    example: word.example
                                });
                            }
                        } catch (error) {
                            console.error(`Erreur lors de l'ajout du mot ${word.word}:`, error);
                            throw new Error('Erreur lors de la vérification des mots');
                        }
                    }
                    
                    if (words_no_example.length > 0) {
                        console.log('Generating examples for words without examples...');
                        
                        try {
                            const words_with_examples = await geminiService.generateExemple(words_no_example);
                            if (Array.isArray(words_with_examples) && words_with_examples.length > 0) {
                                console.log('✅ Examples generated successfully');
                                console.log('Words with examples:', words_with_examples);
                                words = await geminiService.replaceExample(words, words_with_examples);
                            } else {
                                console.log('⚠️ No examples were generated');
                            }
                        } catch (error) {
                           throw new Error('Erreur lors de la génération des exemples');
                        }
                    }

                    if (words_with_error_example.length > 0) {
                        console.log('Correcting examples for words with error examples...');
                        try {
                            const words_with_correct_examples = await geminiService.modifyExample(words_with_error_example);
                            if (Array.isArray(words_with_correct_examples) && words_with_correct_examples.length > 0) {
                                console.log('✅ Examples corrected successfully');
                                console.log('Words with correct examples:', words_with_correct_examples);
                                words = await geminiService.replaceExample(words, words_with_correct_examples);
                            } else {
                                console.log('⚠️ No examples were corrected');
                            }
                        } catch (error) {
                            throw new Error('Erreur lors de la correction des exemples');
                        }
                    }
                    

                    // Ajouter chaque mot à la base de données
                    let successCount = 0;
                    let errChamps = 0;
                
                    for (const wordData of words) {
                        try {
                            // Vérifier que les champs obligatoires sont présents
                            if (!wordData.word || !wordData.language_code || !wordData.subject || !wordData.type || 
                                !wordData.meaning ) {
                                    errChamps ++ ;
                                continue;
                            }
                            
                            // Assurer que level est défini
                            if (wordData.level === undefined || wordData.level === null) {
                                wordData.level = 'x'; // Niveau par défaut
                            }


                            await wordModel.create(wordData, package_id);
                            successCount++;

                        } catch (error) {
                            console.error(`Erreur lors de l'ajout du mot ${wordData.word}:`, error);
                            throw error;
                        }
                    }
                    // Supprimer le fichier temporaire
                    fs.unlinkSync(filePath);
                    // Rediriger avec un message de succès
                    res.status(200).json({
                        success: true,
                        message: `${successCount} mot(s) importé(s) avec succès. ${errChamps} erreur(s) de champs obligatoires. ${errExample} erreur(s) de generation d'exemples`
                    });
                
                } catch (error) {
                    // Supprimer le fichier temporaire si il existe
                    if (req.file && req.file.path) {
                        try {
                            fs.unlinkSync(req.file.path);
                        } catch (unlinkError) {
                            console.error('Erreur lors de la suppression du fichier temporaire:', unlinkError);
                        }
                    }
                    
                    res.status(500).json({
                        success: false,
                        message: error.message
                    });
                }
            });
    }
}

module.exports = new ImportFile();