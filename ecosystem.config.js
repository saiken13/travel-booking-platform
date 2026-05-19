module.exports = {
  apps: [
    {
      name: 'travel-booking-api',
      script: 'server/dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 4000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      log_file: 'logs/combined.log',
      max_memory_restart: '512M',
    },
  ],
};
