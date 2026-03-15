require('dotenv').config();

module.exports = {
  HOST:     process.env.DB_HOST     || process.env.MYSQLHOST,
  USER:     process.env.DB_USER     || process.env.MYSQLUSER,
  PASSWORD: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
  DB:       process.env.DB_NAME     || process.env.MYSQLDATABASE,
  PORT:     process.env.DB_PORT     || process.env.MYSQLPORT || 3306,
  dialect:  'mysql',
  pool: {
    max:     5,
    min:     0,
    acquire: 30000,
    idle:    10000,
  },
  dialectOptions: {
    ssl: {
      rejectUnauthorized: false,
    },
  },
};
