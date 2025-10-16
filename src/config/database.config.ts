import { registerAs } from '@nestjs/config';
import { defineConfig } from '@mikro-orm/mysql';
import { MikroOrmModuleOptions } from '@mikro-orm/nestjs';

const DEFAULTS = {
  dbName: 'koajo',
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'root',
};

export default registerAs(
  'database',
  (): MikroOrmModuleOptions =>
    defineConfig({
      dbName: process.env.MYSQL_DB ?? DEFAULTS.dbName,
      host: process.env.MYSQL_HOST ?? DEFAULTS.host,
      port: Number.parseInt(
        process.env.MYSQL_PORT ?? DEFAULTS.port.toString(),
        10,
      ),
      user: process.env.MYSQL_USER ?? DEFAULTS.user,
      password: process.env.MYSQL_PASSWORD ?? DEFAULTS.password,
      entities: ['dist/**/*.entity.js'],
      entitiesTs: ['src/**/*.entity.ts'],
      migrations: {
        path: 'dist/migrations',
        pathTs: 'src/migrations',
        glob: '!(*.d).{js,ts}',
        emit: 'ts',
      },
      debug: process.env.NODE_ENV !== 'production',
      forceEntityConstructor: true,
      allowGlobalContext: true,
    }),
);
