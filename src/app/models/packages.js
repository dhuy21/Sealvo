class Package {
  async create(packageData) {
    const [result] = await global.dbConnection.execute(
      'INSERT INTO packages (user_id, package_name, package_description, mode) VALUES (?, ?, ?, ?)',
      [
        packageData.user_id,
        packageData.package_name,
        packageData.package_description,
        packageData.mode,
      ]
    );
    return result.insertId;
  }

  async findPackageById(packageId) {
    const [result] = await global.dbConnection.execute(
      'SELECT * FROM packages WHERE package_id = ?',
      [packageId]
    );
    return result[0];
  }

  async findPackagesByUserId(userId) {
    const [result] = await global.dbConnection.execute('SELECT * FROM packages WHERE user_id = ?', [
      userId,
    ]);
    return result;
  }

  async findAllPublicPackages() {
    const [result] = await global.dbConnection.execute(
      'SELECT p.*, u.username FROM packages p JOIN users u ON p.user_id = u.id WHERE p.mode = "public" or p.mode = "protected" ORDER BY p.created_at DESC'
    );
    return result;
  }

  async updateInfoPackage(packageData, packageId) {
    await global.dbConnection.execute(
      'UPDATE packages SET package_name = ?, package_description = ? WHERE package_id = ?',
      [packageData.package_name, packageData.package_description, packageId]
    );
    return true;
  }

  async updateModePackage(packageId, mode) {
    await global.dbConnection.execute('UPDATE packages SET mode = ? WHERE package_id = ?', [
      mode,
      packageId,
    ]);
    return true;
  }

  async updateActivationPackage(packageId, isActive) {
    await global.dbConnection.execute('UPDATE packages SET is_active = ? WHERE package_id = ?', [
      isActive,
      packageId,
    ]);
    return true;
  }

  async deletePackage(packageId) {
    await global.dbConnection.execute('DELETE FROM packages WHERE package_id = ?', [packageId]);
    return true;
  }
}

module.exports = new Package();
