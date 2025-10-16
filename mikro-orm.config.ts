import { defineConfig } from '@mikro-orm/mysql';
import { Migrator } from '@mikro-orm/migrations';
import { config } from 'dotenv';

config();

export default defineConfig({
  dbName: process.env.MYSQL_DB ?? 'koajo',
  user: process.env.MYSQL_USER ?? 'root',
  password: process.env.MYSQL_PASSWORD ?? 'root',
  host: process.env.MYSQL_HOST ?? 'localhost',
  port: Number.parseInt(process.env.MYSQL_PORT ?? '3306', 10),
  entities: ['dist/**/*.entity.js'],
  entitiesTs: ['src/**/*.entity.ts'],
  migrations: {
    path: 'dist/migrations',
    pathTs: 'src/migrations',
    glob: '!(*.d).{js,ts}',
    emit: 'ts',
  },
  allowGlobalContext: false,
  extensions: [Migrator],
});
