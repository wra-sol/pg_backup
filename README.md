# PostgreSQL Backup Tool

A robust Node.js tool for backing up PostgreSQL databases to S3-compatible storage services. This tool provides both CLI and programmatic interfaces for automated database backups.

## Features

- 🔄 **Full Database Backups** - Complete PostgreSQL database dumps
- 🎯 **Selective Backups** - Schema-only, data-only, or specific table backups
- ☁️ **S3-Compatible Storage** - Works with AWS S3, MinIO, DigitalOcean Spaces, and other S3-compatible services
- 🗜️ **Compression** - Gzip compression to reduce storage costs
- 🧹 **Automatic Cleanup** - Configurable retention policy for old backups
- 🔧 **Flexible Configuration** - Environment variables, CLI options, or programmatic configuration
- ✅ **Connection Testing** - Built-in tools to verify database and S3 connections
- 📋 **Backup Management** - List and manage existing backups

## Installation

1. Clone or download this repository
2. Install dependencies:

```bash
npm install
```

3. Copy the example environment file:

```bash
cp env.example .env
```

4. Configure your environment variables in `.env` (see Configuration section)

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# PostgreSQL Connection
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=your_database
PG_USER=your_username
PG_PASSWORD=your_password

# S3-Compatible Storage
S3_ENDPOINT=https://your-s3-endpoint.com
S3_REGION=us-east-1
S3_BUCKET=your-backup-bucket
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key

# Optional: S3 Path Prefix
S3_PREFIX=backups/

# Optional: Backup Settings
BACKUP_RETENTION_DAYS=30
COMPRESSION_LEVEL=6
```

### S3-Compatible Services

This tool works with any S3-compatible service:

- **AWS S3**: `S3_ENDPOINT=https://s3.amazonaws.com`
- **MinIO**: `S3_ENDPOINT=http://localhost:9000`
- **DigitalOcean Spaces**: `S3_ENDPOINT=https://nyc3.digitaloceanspaces.com`
- **Cloudflare R2**: `S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com`

## Usage

### CLI Usage

#### Create a Backup

```bash
# Basic backup using environment variables
npm run backup

# Or with explicit configuration
npx pg-backup backup \
  --pg-host localhost \
  --pg-database mydb \
  --pg-user myuser \
  --pg-password mypass \
  --s3-endpoint https://s3.amazonaws.com \
  --s3-bucket my-backup-bucket \
  --s3-access-key-id AKIA... \
  --s3-secret-access-key secret...
```

#### Schema-Only Backup

```bash
npx pg-backup backup --schema-only
```

#### Data-Only Backup

```bash
npx pg-backup backup --data-only
```

#### Backup Specific Tables

```bash
npx pg-backup backup --tables users orders products
```

#### Test Connections

```bash
npx pg-backup test-connection
```

#### List Existing Backups

```bash
npx pg-backup list
```

#### Clean Up Old Backups

```bash
npx pg-backup cleanup
```

### Programmatic Usage

```javascript
import { PostgreSQLBackup, Config } from './src/index.js';

// Using environment variables
const config = new Config();
const backup = new PostgreSQLBackup(config);

// Create a backup
const result = await backup.createBackup();
console.log('Backup created:', result.s3Key);

// Test connections
const dbConnected = await backup.testConnection();
const s3Connected = await backup.testS3Connection();

// List backups
const backups = await backup.listBackups();
console.log('Existing backups:', backups.length);

// Clean up old backups
await backup.cleanupOldBackups();
```

### Custom Configuration

```javascript
import { PostgreSQLBackup, Config } from './src/index.js';

const config = new Config({
  pgHost: 'localhost',
  pgPort: 5432,
  pgDatabase: 'mydb',
  pgUser: 'myuser',
  pgPassword: 'mypass',
  s3Endpoint: 'https://s3.amazonaws.com',
  s3Region: 'us-east-1',
  s3Bucket: 'my-backup-bucket',
  s3AccessKeyId: 'AKIA...',
  s3SecretAccessKey: 'secret...',
  s3Prefix: 'backups/',
  retentionDays: 30,
  compressionLevel: 6
});

const backup = new PostgreSQLBackup(config);
```

## Backup Options

### Backup Types

- **Full Backup** (default): Complete database dump including schema and data
- **Schema Only**: `--schema-only` - Only database structure (tables, indexes, functions, etc.)
- **Data Only**: `--data-only` - Only data, no schema
- **Table Specific**: `--tables table1 table2` - Backup only specified tables

### Compression

Backups are automatically compressed using gzip. Compression level can be configured:

- Level 1-3: Fast compression, larger files
- Level 6 (default): Balanced compression
- Level 9: Maximum compression, slower

### Retention Policy

Configure automatic cleanup of old backups:

```env
BACKUP_RETENTION_DAYS=30  # Keep backups for 30 days
```

## Requirements

- Node.js 18.0.0 or higher
- PostgreSQL client tools (`pg_dump`) installed and accessible
- Access to an S3-compatible storage service

### Installing PostgreSQL Client Tools

**Ubuntu/Debian:**
```bash
sudo apt-get install postgresql-client
```

**macOS:**
```bash
brew install postgresql
```

**Windows:**
Download from [PostgreSQL official website](https://www.postgresql.org/download/windows/)

## Error Handling

The tool includes comprehensive error handling:

- Database connection failures
- S3 authentication and network errors
- Backup process failures
- File system errors

All errors are logged with descriptive messages to help with troubleshooting.

## Security Considerations

- Store sensitive credentials in environment variables, not in code
- Use IAM roles when possible instead of access keys
- Ensure S3 bucket has appropriate access controls
- Consider encrypting backups at rest
- Use secure connections (HTTPS) for S3 endpoints

## Troubleshooting

### Common Issues

1. **"pg_dump: command not found"**
   - Install PostgreSQL client tools
   - Ensure `pg_dump` is in your PATH

2. **"Database connection failed"**
   - Verify database credentials
   - Check if PostgreSQL is running
   - Ensure network connectivity

3. **"S3 connection failed"**
   - Verify S3 credentials and endpoint
   - Check bucket permissions
   - Ensure network connectivity

4. **"Missing required configuration"**
   - Check that all required environment variables are set
   - Verify `.env` file is in the correct location

### Debug Mode

Set `NODE_ENV=development` for additional debug output:

```bash
NODE_ENV=development npm run backup
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions:
1. Check the troubleshooting section
2. Search existing issues
3. Create a new issue with detailed information
