import { Module } from '@nestjs/common'
import { AccountModule } from '../../account/account.module.js'
import { AgendaModule } from '../agenda/agenda.module.js'
import { AttachmentsModule } from '../attachments/attachments.module.js'
import { ProjectsModule } from '../projects/projects.module.js'
import { SprintsModule } from '../sprints/sprints.module.js'
import { TasksModule } from '../tasks/tasks.module.js'
import { TrashModule } from '../trash/trash.module.js'
import { SchoolController } from './school.controller.js'
import { SchoolRepository } from './school.repository.js'
import { SchoolService } from './school.service.js'
import { SchoolTrash } from './school.trash.js'

// Escuela es una hoja del grafo de módulos: depende de Proyectos, Agenda, Tareas, Sprints y Attachments (la
// materia es un proyecto, sus clases son eventos, sus entregas son tareas, y puede tener archivos subidos) y
// ninguno depende de ella, así no hay dependencias circulares. Cuenta le da la zona horaria para saber qué día
// es "hoy".
@Module({
  imports: [AccountModule, ProjectsModule, AgendaModule, TasksModule, SprintsModule, AttachmentsModule, TrashModule],
  controllers: [SchoolController],
  providers: [SchoolService, SchoolRepository, SchoolTrash],
})
export class SchoolModule {}
