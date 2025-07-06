const db = require('../core/database');

class Package {
    async create(packageData) {
        try {
            const [result] = await global.dbConnection.execute('INSERT INTO packages (user_id, package_name, package_description) VALUES (?, ?, ?)', 
                [packageData.user_id, packageData.package_name, packageData.package_description]);
            return result.insertId;
        } catch (error) {
            console.error('Erreur lors de la création du package:', error);
            throw error;
        }
    }

    async findPackageById(packageId) {
        try {
            const [result] = await global.dbConnection.execute('SELECT * FROM packages WHERE package_id = ?', [packageId]);
            return result[0];
        } catch (error) {
            console.error('Erreur lors de la recherche du package:', error);
            throw error;
        }
    }

    async findPackagesByUserId(userId) {
        try {
            const [result] = await global.dbConnection.execute('SELECT * FROM packages WHERE user_id = ?', [userId]);
            return result;
        } catch (error) {
            console.error('Erreur lors de la recherche des packages:', error);
            throw error;
        }
    }

    async updateInfoPackage(packageData, packageId) {
        try {
            await global.dbConnection.execute('UPDATE packages SET package_name = ?, package_description = ? WHERE package_id = ?', 
                [packageData.package_name, packageData.package_description, packageId]);
            return true;
        } catch (error) {
            console.error('Erreur lors de la mise à jour des informations du package:', error);
            throw error;
        }
    }

    async updateModePackage(packageId, mode) {
        try {
            await global.dbConnection.execute('UPDATE packages SET mode = ? WHERE package_id = ?', [mode, packageId]);
            return true;
        } catch (error) {
            console.error('Erreur lors de la mise à jour du mode du package:', error);
            throw error;
        }
    }
    async deletePackage(packageId) {
        try {
            await global.dbConnection.execute('DELETE FROM packages WHERE package_id = ?', [packageId]);
            return true;
        } catch (error) {
            console.error('Erreur lors de la suppression du package:', error);
            throw error;
        }
    }
}

module.exports = new Package();