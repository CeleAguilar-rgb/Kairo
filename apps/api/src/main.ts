import { NestFactory } from '@nestjs/core'
import helmet from 'helmet'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.use(helmet())
  app.enableCors()
  app.setGlobalPrefix('v1')

  await app.listen(process.env.PORT ?? 3001)
}

bootstrap()
