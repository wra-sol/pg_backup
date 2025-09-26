import { Config } from './config.js';
import { PostgreSQLBackup } from './backup.js';

/**
 * Main entry point for programmatic usage
 */
export { Config, PostgreSQLBackup };

/**
 * Create a backup with the given configuration
 */
export async function createBackup(configOptions = {}) {
  const config = new Config(configOptions);
  const backup = new PostgreSQLBackup(config);
  return await backup.createBackup();
}

/**
 * Test connections with the given configuration
 */
export async function testConnections(configOptions = {}) {
  const config = new Config(configOptions);
  const backup = new PostgreSQLBackup(config);
  
  const dbConnected = await backup.testConnection();
  const s3Connected = await backup.testS3Connection();
  
  return {
    database: dbConnected,
    s3: s3Connected,
    allConnected: dbConnected && s3Connected
  };
}

/**
 * List existing backups
 */
export async function listBackups(configOptions = {}) {
  const config = new Config(configOptions);
  const backup = new PostgreSQLBackup(config);
  return await backup.listBackups();
}

/**
 * Clean up old backups
 */
export async function cleanupBackups(configOptions = {}) {
  const config = new Config(configOptions);
  const backup = new PostgreSQLBackup(config);
  return await backup.cleanupOldBackups();
}
