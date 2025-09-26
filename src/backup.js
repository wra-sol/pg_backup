import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Client } from 'pg';
import { createReadStream, createWriteStream, unlinkSync, existsSync, mkdirSync, statSync, rmSync } from 'fs';
import { spawn } from 'child_process';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { Config } from './config.js';

/**
 * PostgreSQL backup tool with S3-compatible storage support
 */
export class PostgreSQLBackup {
  constructor(config) {
    this.config = config;
    this.s3Client = new S3Client(config.getS3Config());
  }

  /**
   * Create a backup of the PostgreSQL database
   */
  async createBackup(options = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${this.config.pg.database}-${timestamp}`;
    const tempDir = join(tmpdir(), `pg-backup-${Date.now()}`);
    
    try {
      console.log(`Starting backup of database: ${this.config.pg.database}`);
      
      // Create temporary directory
      mkdirSync(tempDir, { recursive: true });
      
      // Create pg_dump command
      const dumpFile = join(tempDir, `${backupName}.sql`);
      const compressedFile = `${dumpFile}.gz`;
      
      const pgDumpArgs = [
        '--host', this.config.pg.host,
        '--port', this.config.pg.port.toString(),
        '--username', this.config.pg.user,
        '--dbname', this.config.pg.database,
        '--no-password', // Use PGPASSWORD environment variable
        '--verbose',
        '--format', 'custom',
        '--file', dumpFile
      ];

      // Add additional options if specified
      if (options.schemaOnly) {
        pgDumpArgs.push('--schema-only');
      }
      if (options.dataOnly) {
        pgDumpArgs.push('--data-only');
      }
      if (options.tables && options.tables.length > 0) {
        options.tables.forEach(table => {
          pgDumpArgs.push('--table', table);
        });
      }

      // Set password environment variable
      const env = { ...process.env, PGPASSWORD: this.config.pg.password };

      console.log('Running pg_dump...');
      await this.runCommand('pg_dump', pgDumpArgs, { env });

      // Compress the backup
      console.log('Compressing backup...');
      await this.compressFile(dumpFile, compressedFile);

      // Upload to S3
      console.log('Uploading to S3...');
      const s3Key = `${this.config.s3.prefix}${backupName}.sql.gz`;
      await this.uploadToS3(compressedFile, s3Key);

      // Clean up old backups if retention is configured
      if (this.config.backup.retentionDays > 0) {
        await this.cleanupOldBackups();
      }

      console.log(`Backup completed successfully: ${s3Key}`);
      return {
        success: true,
        s3Key,
        backupName,
        size: this.getFileSize(compressedFile)
      };

    } catch (error) {
      console.error('Backup failed:', error.message);
      throw error;
    } finally {
      // Clean up temporary files
      this.cleanupTempFiles(tempDir);
    }
  }

  /**
   * Run a system command
   */
  runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        stdio: 'inherit',
        ...options
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to start command: ${error.message}`));
      });
    });
  }

  /**
   * Compress a file using gzip
   */
  async compressFile(inputFile, outputFile) {
    const readStream = createReadStream(inputFile);
    const writeStream = createWriteStream(outputFile);
    const gzipStream = createGzip({ level: this.config.backup.compressionLevel });

    await pipeline(readStream, gzipStream, writeStream);
  }

  /**
   * Upload file to S3
   */
  async uploadToS3(filePath, s3Key) {
    const fileStream = createReadStream(filePath);
    
    const command = new PutObjectCommand({
      Bucket: this.config.s3.bucket,
      Key: s3Key,
      Body: fileStream,
      ContentType: 'application/gzip',
      Metadata: {
        'backup-database': this.config.pg.database,
        'backup-timestamp': new Date().toISOString(),
        'backup-tool': 'pg-backup-tool'
      }
    });

    await this.s3Client.send(command);
  }

  /**
   * List existing backups
   */
  async listBackups() {
    const command = new ListObjectsV2Command({
      Bucket: this.config.s3.bucket,
      Prefix: this.config.s3.prefix
    });

    const response = await this.s3Client.send(command);
    return response.Contents || [];
  }

  /**
   * Clean up old backups based on retention policy
   */
  async cleanupOldBackups() {
    console.log(`Cleaning up backups older than ${this.config.backup.retentionDays} days...`);
    
    const backups = await this.listBackups();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.backup.retentionDays);

    const oldBackups = backups.filter(backup => {
      const backupDate = new Date(backup.LastModified);
      return backupDate < cutoffDate;
    });

    for (const backup of oldBackups) {
      console.log(`Deleting old backup: ${backup.Key}`);
      const command = new DeleteObjectCommand({
        Bucket: this.config.s3.bucket,
        Key: backup.Key
      });
      await this.s3Client.send(command);
    }

    console.log(`Cleaned up ${oldBackups.length} old backups`);
  }

  /**
   * Test database connection
   */
  async testConnection() {
    const client = new Client({
      host: this.config.pg.host,
      port: this.config.pg.port,
      database: this.config.pg.database,
      user: this.config.pg.user,
      password: this.config.pg.password,
    });

    try {
      await client.connect();
      const result = await client.query('SELECT version()');
      console.log('Database connection successful');
      console.log(`PostgreSQL version: ${result.rows[0].version}`);
      return true;
    } catch (error) {
      console.error('Database connection failed:', error.message);
      return false;
    } finally {
      await client.end();
    }
  }

  /**
   * Test S3 connection
   */
  async testS3Connection() {
    try {
      await this.listBackups();
      console.log('S3 connection successful');
      return true;
    } catch (error) {
      console.error('S3 connection failed:', error.message);
      return false;
    }
  }

  /**
   * Get file size in bytes
   */
  getFileSize(filePath) {
    if (existsSync(filePath)) {
      const stats = statSync(filePath);
      return stats.size;
    }
    return 0;
  }

  /**
   * Clean up temporary files
   */
  cleanupTempFiles(tempDir) {
    try {
      if (existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn('Failed to clean up temporary files:', error.message);
    }
  }
}
