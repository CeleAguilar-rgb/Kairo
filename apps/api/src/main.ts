import { NestFactory } from '@nestjs/core'
import helmet from 'helmet'
import { AppModule } from './app.module.js'
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.use(helmet())
  app.enableCors()
  app.setGlobalPrefix('v1')
  app.useGlobalFilters(new HttpExceptionFilter())

  await app.listen(process.env.PORT ?? 3001)
}

bootstrap()
