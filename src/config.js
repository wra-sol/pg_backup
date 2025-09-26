import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Configuration class for managing database and S3 settings
 */
export class Config {
  constructor(options = {}) {
    // PostgreSQL configuration
    this.pg = {
      host: options.pgHost || process.env.PG_HOST || 'localhost',
      port: parseInt(options.pgPort || process.env.PG_PORT || '5432'),
      database: options.pgDatabase || process.env.PG_DATABASE,
      user: options.pgUser || process.env.PG_USER,
      password: options.pgPassword || process.env.PG_PASSWORD,
    };

    // S3 configuration
    this.s3 = {
      endpoint: options.s3Endpoint || process.env.S3_ENDPOINT,
      region: options.s3Region || process.env.S3_REGION || 'us-east-1',
      bucket: options.s3Bucket || process.env.S3_BUCKET,
      accessKeyId: options.s3AccessKeyId || process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: options.s3SecretAccessKey || process.env.S3_SECRET_ACCESS_KEY,
      prefix: options.s3Prefix || process.env.S3_PREFIX || 'backups/',
    };

    // Backup settings
    this.backup = {
      retentionDays: parseInt(options.retentionDays || process.env.BACKUP_RETENTION_DAYS || '30'),
      compressionLevel: parseInt(options.compressionLevel || process.env.COMPRESSION_LEVEL || '6'),
    };

    this.validate();
  }

  /**
   * Validate required configuration
   */
  validate() {
    const required = [
      { key: 'PG_DATABASE', value: this.pg.database },
      { key: 'PG_USER', value: this.pg.user },
      { key: 'PG_PASSWORD', value: this.pg.password },
      { key: 'S3_ENDPOINT', value: this.s3.endpoint },
      { key: 'S3_BUCKET', value: this.s3.bucket },
      { key: 'S3_ACCESS_KEY_ID', value: this.s3.accessKeyId },
      { key: 'S3_SECRET_ACCESS_KEY', value: this.s3.secretAccessKey },
    ];

    const missing = required.filter(({ value }) => !value);
    
    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.map(({ key }) => key).join(', ')}`);
    }
  }

  /**
   * Get PostgreSQL connection string
   */
  getConnectionString() {
    return `postgresql://${this.pg.user}:${this.pg.password}@${this.pg.host}:${this.pg.port}/${this.pg.database}`;
  }

  /**
   * Get S3 client configuration
   */
  getS3Config() {
    return {
      endpoint: this.s3.endpoint,
      region: this.s3.region,
      credentials: {
        accessKeyId: this.s3.accessKeyId,
        secretAccessKey: this.s3.secretAccessKey,
      },
      forcePathStyle: true, // Required for S3-compatible services
    };
  }
}
