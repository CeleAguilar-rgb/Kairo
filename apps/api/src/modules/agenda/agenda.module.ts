import { Module } from '@nestjs/common'
import { ProjectsModule } from '../projects/projects.module'
import { AgendaController } from './agenda.controller'
import { AgendaRepository } from './agenda.repository'
import { AgendaService } from './agenda.service'

// Escuela le pide a AgendaService las clases de una materia (eventos semanales con su proyecto); por eso lo exporta.
@Module({
  imports: [ProjectsModule],
  controllers: [AgendaController],
  providers: [AgendaService, AgendaRepository],
  exports: [AgendaService],
})
export class AgendaModule {}
