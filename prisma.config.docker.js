const { defineConfig, env } = require('prisma/config')

module.exports = defineConfig({
  schema: '/app/prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL')
  },
})
