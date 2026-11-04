import { Module } from '@nestjs/common'
import { AccountModule } from '../../account/account.module'
import { AgendaModule } from '../agenda/agenda.module'
import { AttachmentsModule } from '../attachments/attachments.module'
import { ProjectsModule } from '../projects/projects.module'
import { SprintsModule } from '../sprints/sprints.module'
import { TasksModule } from '../tasks/tasks.module'
import { TrashModule } from '../trash/trash.module'
import { SchoolController } from './school.controller'
import { SchoolRepository } from './school.repository'
import { SchoolService } from './school.service'
import { SchoolTrash } from './school.trash'

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
