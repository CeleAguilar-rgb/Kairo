import { Module } from '@nestjs/common'
import { ProjectsModule } from '../projects/projects.module'
import { AgendaController } from './agenda.controller'
import { AgendaRepository } from './agenda.repository'
import { AgendaService } from './agenda.service'

@Module({
  imports: [ProjectsModule],
  controllers: [AgendaController],
  providers: [AgendaService, AgendaRepository],
})
export class AgendaModule {}
