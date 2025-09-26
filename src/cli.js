#!/usr/bin/env node

import { Command } from 'commander';
import { Config } from './config.js';
import { PostgreSQLBackup } from './backup.js';

const program = new Command();

program
  .name('pg-backup')
  .description('PostgreSQL backup tool with S3-compatible storage support')
  .version('1.0.0');

program
  .command('backup')
  .description('Create a backup of the PostgreSQL database')
  .option('--schema-only', 'Backup only the schema (no data)')
  .option('--data-only', 'Backup only the data (no schema)')
  .option('--tables <tables...>', 'Backup only specific tables')
  .option('--pg-host <host>', 'PostgreSQL host')
  .option('--pg-port <port>', 'PostgreSQL port')
  .option('--pg-database <database>', 'PostgreSQL database name')
  .option('--pg-user <user>', 'PostgreSQL username')
  .option('--pg-password <password>', 'PostgreSQL password')
  .option('--s3-endpoint <endpoint>', 'S3-compatible endpoint URL')
  .option('--s3-region <region>', 'S3 region')
  .option('--s3-bucket <bucket>', 'S3 bucket name')
  .option('--s3-access-key-id <key>', 'S3 access key ID')
  .option('--s3-secret-access-key <secret>', 'S3 secret access key')
  .option('--s3-prefix <prefix>', 'S3 key prefix for backups')
  .option('--retention-days <days>', 'Number of days to retain backups')
  .option('--compression-level <level>', 'Gzip compression level (1-9)')
  .action(async (options) => {
    try {
      const config = new Config(options);
      const backup = new PostgreSQLBackup(config);
      
      console.log('Starting backup process...');
      const result = await backup.createBackup({
        schemaOnly: options.schemaOnly,
        dataOnly: options.dataOnly,
        tables: options.tables
      });
      
      console.log('Backup completed successfully!');
      console.log(`S3 Key: ${result.s3Key}`);
      console.log(`Size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
      
    } catch (error) {
      console.error('Backup failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('test-connection')
  .description('Test database and S3 connections')
  .option('--pg-host <host>', 'PostgreSQL host')
  .option('--pg-port <port>', 'PostgreSQL port')
  .option('--pg-database <database>', 'PostgreSQL database name')
  .option('--pg-user <user>', 'PostgreSQL username')
  .option('--pg-password <password>', 'PostgreSQL password')
  .option('--s3-endpoint <endpoint>', 'S3-compatible endpoint URL')
  .option('--s3-region <region>', 'S3 region')
  .option('--s3-bucket <bucket>', 'S3 bucket name')
  .option('--s3-access-key-id <key>', 'S3 access key ID')
  .option('--s3-secret-access-key <secret>', 'S3 secret access key')
  .action(async (options) => {
    try {
      const config = new Config(options);
      const backup = new PostgreSQLBackup(config);
      
      console.log('Testing connections...');
      
      const dbConnected = await backup.testConnection();
      const s3Connected = await backup.testS3Connection();
      
      if (dbConnected && s3Connected) {
        console.log('All connections successful!');
      } else {
        console.log('Some connections failed.');
        process.exit(1);
      }
      
    } catch (error) {
      console.error('Connection test failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List existing backups in S3')
  .option('--s3-endpoint <endpoint>', 'S3-compatible endpoint URL')
  .option('--s3-region <region>', 'S3 region')
  .option('--s3-bucket <bucket>', 'S3 bucket name')
  .option('--s3-access-key-id <key>', 'S3 access key ID')
  .option('--s3-secret-access-key <secret>', 'S3 secret access key')
  .option('--s3-prefix <prefix>', 'S3 key prefix for backups')
  .action(async (options) => {
    try {
      const config = new Config(options);
      const backup = new PostgreSQLBackup(config);
      
      const backups = await backup.listBackups();
      
      if (backups.length === 0) {
        console.log('No backups found.');
        return;
      }
      
      console.log(`Found ${backups.length} backup(s):`);
      console.log('');
      
      backups
        .sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified))
        .forEach((backup, index) => {
          const size = (backup.Size / 1024 / 1024).toFixed(2);
          const date = new Date(backup.LastModified).toLocaleString();
          console.log(`${index + 1}. ${backup.Key}`);
          console.log(`   Size: ${size} MB`);
          console.log(`   Date: ${date}`);
          console.log('');
        });
      
    } catch (error) {
      console.error('Failed to list backups:', error.message);
      process.exit(1);
    }
  });

program
  .command('cleanup')
  .description('Clean up old backups based on retention policy')
  .option('--s3-endpoint <endpoint>', 'S3-compatible endpoint URL')
  .option('--s3-region <region>', 'S3 region')
  .option('--s3-bucket <bucket>', 'S3 bucket name')
  .option('--s3-access-key-id <key>', 'S3 access key ID')
  .option('--s3-secret-access-key <secret>', 'S3 secret access key')
  .option('--s3-prefix <prefix>', 'S3 key prefix for backups')
  .option('--retention-days <days>', 'Number of days to retain backups')
  .action(async (options) => {
    try {
      const config = new Config(options);
      const backup = new PostgreSQLBackup(config);
      
      console.log('Cleaning up old backups...');
      await backup.cleanupOldBackups();
      console.log('Cleanup completed!');
      
    } catch (error) {
      console.error('Cleanup failed:', error.message);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();
