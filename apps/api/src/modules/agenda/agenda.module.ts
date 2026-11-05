import { Module } from '@nestjs/common'
import { ProjectsModule } from '../projects/projects.module.js'
import { AgendaController } from './agenda.controller.js'
import { AgendaRepository } from './agenda.repository.js'
import { AgendaService } from './agenda.service.js'
import { AgendaTrash } from './agenda.trash.js'
import { AgendaSearch } from './agenda.search.js'

// Escuela le pide a AgendaService las clases de una materia (eventos semanales con su proyecto); por eso lo exporta.
@Module({
  imports: [ProjectsModule],
  controllers: [AgendaController],
  providers: [AgendaService, AgendaRepository, AgendaTrash, AgendaSearch],
  exports: [AgendaService],
})
export class AgendaModule {}
